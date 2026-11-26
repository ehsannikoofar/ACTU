// Agent 1 — Outreach agent: the V−24h call.
// Collects the 10 screening answers and (with consent) a wound photo over video. It gives no
// clinical advice. The opening line, including the 911 sentence, is fixed text (not generated).
import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { ITEM_IDS, type Answers, type ItemId } from "@/lib/pathway/questionnaire";
import type { CallTurn } from "@/lib/store";
import { BASE, claude } from "./claude";

export const TurnSchema = z.object({
  say: z.string().describe("What the agent says next: at most 2 short sentences, plain language, in the call language"),
  updates: z
    .array(z.object({ item: z.enum(ITEM_IDS as [ItemId, ...ItemId[]]), answer: z.enum(["yes", "no"]) }))
    .describe("Answers the patient clearly gave in their LAST message only"),
  video_consent: z.enum(["yes", "no", "unknown"]),
  request_photo_capture: z.boolean().describe("true only when the patient is on video and has the incision in view, ready for a still photo"),
  patient_unavailable: z.boolean().describe("true if the patient says it is not a good time, refuses, or is not the patient"),
  done: z.boolean().describe("true after the closing sentence, when all items are answered or the call must end"),
});
export type AgentTurn = z.infer<typeof TurnSchema>;

const QUESTION_GUIDE: Record<ItemId, string> = {
  wound_opening: "Is there any opening or gap in your incision?",
  wound_drainage_redness: "Is there any drainage, or redness that is spreading around the incision?",
  wound_protruding: "Can you see or feel a suture or wire poking out of the skin?",
  sym_fever: "Have you had a fever or chills?",
  sym_chest_pain_sob: "Do you have new or worse chest pain, or shortness of breath?",
  sym_dizzy_hr_bp: "Have you felt dizzy, or noticed an abnormal heart rate or blood pressure?",
  pt_device_camera: "Do you have a smartphone or tablet with a camera?",
  pt_internet: "Do you have reliable internet access?",
  pt_can_send_photo: "Are you able to send a photo of your incision, on your own or with help from family?",
  pt_willing_video_phone: "Would you be willing to have your follow-up visit by video or phone?",
};

function system(lang: "en" | "fr"): string {
  return `You are the automated pre-visit outreach assistant for the Acute Cardiac Triage Unit (ACTU) at a cardiac hospital. You are on a live call with a patient whose follow-up visit is in about 24 hours, after a sternal wire-related procedure. Speak ${lang === "fr" ? "Canadian French" : "English"}.

Your ONLY job: collect answers to 10 yes/no questions and, if the patient agrees to video, a still photo of the incision. Then thank them and end the call.

Strict rules:
- Never give medical advice, reassurance, interpretation, or opinions about their symptoms or wound. If asked a medical question, say the care team will review their answers and follow up.
- If the patient describes an emergency happening right now (for example severe chest pain, trouble breathing, fainting), say: "If this is an emergency, please hang up and call 911." Then continue only if they want to.
- Keep each turn to at most 2 short sentences. One question at a time. Use simple words.
- Record an answer only when it is clearly yes or no. If unclear, ask again briefly.
- Do not ask about anything else. Do not collect names, addresses or other personal details.

Flow:
1. The opening line has already been said (it asked whether now is a good time). If the patient says it's not a good time or refuses, set patient_unavailable=true, say a polite goodbye, done=true.
2. Ask whether they would prefer to switch to a video call so they can show their incision, or continue by voice. Record video_consent.
3. If video: ask them to point the camera at the incision; when they say it is in view, set request_photo_capture=true and say you are taking the photo. (The app captures the image and then tells you "[photo captured]".)
4. Ask the 10 questions in this order, skipping any already answered:
${ITEM_IDS.map((id, i) => `   ${i + 1}. ${id}: ${QUESTION_GUIDE[id]}`).join("\n")}
   If they agreed to video and a photo was captured, items pt_device_camera, pt_internet and pt_can_send_photo may be recorded as "yes" without asking.
5. When all 10 are answered: thank them, say the care team will review their answers before the visit, and set done=true.`;
}

export function openingLine(lang: "en" | "fr", visitLocal: string): string {
  return lang === "fr"
    ? `Bonjour, ici l'assistant automatisé de l'Unité de triage cardiaque aiguë de l'Institut de cardiologie de l'Université d'Ottawa, au sujet de votre visite de suivi du ${visitLocal}. Cet appel sert uniquement à recueillir vos réponses pour votre équipe de soins. En cas d'urgence, raccrochez et composez le 911. Est-ce un bon moment pour quelques questions courtes?`
    : `Hello, this is the automated assistant from the Acute Cardiac Triage Unit at the University of Ottawa Heart Institute, calling about your follow-up visit on ${visitLocal}. This call only collects your answers for your care team. If you have an emergency, hang up and call 911. Is now a good time for a few short questions?`;
}

export async function nextTurn(lang: "en" | "fr", turns: CallTurn[], answers: Answers, photoCaptured: boolean): Promise<AgentTurn> {
  const transcript = turns.map((t) => `${t.role === "agent" ? "AGENT" : "PATIENT"}: ${t.text}`).join("\n");
  const res = await claude().beta.messages.parse({
    ...BASE,
    max_tokens: 2000,
    output_config: { effort: "low", format: betaZodOutputFormat(TurnSchema) },
    system: system(lang),
    messages: [
      {
        role: "user",
        content: `Call transcript so far:\n${transcript}\n\nAnswers recorded so far: ${JSON.stringify(answers)}\nPhoto captured: ${photoCaptured ? "yes" : "no"}\n\nProduce the agent's next turn.`,
      },
    ],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) {
    throw new Error("The call assistant could not produce a reply.");
  }
  return res.parsed_output;
}
