"""Source of truth for the EN/FR UI strings. Edit here, then run:
    python3 scripts/gen_i18n.py
which rewrites lib/i18n/en.json and lib/i18n/fr.json (and fails if a key is missing in either language)."""
import json, sys
E = {}; F = {}
def k(key, en, fr): E[key]=en; F[key]=fr

# App / nav / auth
k("app.name","ACTU Virtual Follow-Up","Suivi virtuel de l'UTCA")
k("app.tagline","Pre-visit screening · Proof of concept","Dépistage avant la visite · Preuve de concept")
k("app.homeLabel","ACTU Virtual Follow-Up — home","Suivi virtuel de l'UTCA — accueil")
k("app.logoAlt","University of Ottawa Heart Institute — 50 years","Institut de cardiologie de l'Université d'Ottawa — 50 ans")
k("nav.skip","Skip to main content","Passer au contenu principal")
k("nav.label","Main navigation","Navigation principale")
k("nav.worklist","Worklist","Liste de travail")
k("nav.patientApp","Patient phones","Téléphones des patients")
k("nav.demo","Demo controls","Commandes de démonstration")
k("auth.signIn","Sign in with Epic","Se connecter avec Epic")
k("auth.signOut","Sign out","Se déconnecter")
k("auth.signedInAs","Signed in: {user}","Connecté : {user}")
k("lang.switch","Français","English")
k("lang.switchLabel","Afficher en français","Display in English")
k("banner.offline","Offline sample data — no Epic connection. Names and chart data on screen are hand-written samples, not Epic records.","Données d'exemple hors ligne — aucune connexion à Epic. Les noms et données affichés sont des exemples rédigés à la main, pas des dossiers Epic.")
k("footer.synthetic","Proof of concept for an MHA residency presentation. Synthetic data only: Epic sandbox test patients, invented procedures and computer-generated wound images. Not for clinical use.","Preuve de concept pour une présentation de résidence en MHA. Données synthétiques seulement : patients fictifs du bac à sable Epic, interventions inventées et images de plaies générées par ordinateur. Non destiné à un usage clinique.")
k("footer.ai","AI recommends; the APN decides. The Virtual-care Suitability Index is illustrative and has not been validated.","L'IA recommande; l'IPA décide. L'indice d'aptitude aux soins virtuels est illustratif et n'a pas été validé.")

# Common
k("common.yes","Yes","Oui"); k("common.no","No","Non")
k("common.configured","Configured","Configuré"); k("common.ready","Ready","Prêt"); k("common.actionNeeded","Action needed","Action requise")

# Home
k("home.title","Pre-visit screening for virtual follow-up","Dépistage avant la visite pour le suivi virtuel")
k("home.lead","Two AI agents support the ACTU pathway after sternal wire–related procedures: one collects the pre-visit questionnaire and wound photo, the other prepares the evidence for the APN.","Deux agents d'IA soutiennent le cheminement de l'UTCA après une intervention liée aux fils sternaux : l'un recueille le questionnaire avant la visite et la photo de la plaie, l'autre prépare les données pour l'IPA.")
k("home.authError","Sign-in failed:","Échec de la connexion :")
k("home.agents","The two agents","Les deux agents")
k("home.agent1.title","Outreach Agent","Agent de liaison")
k("home.agent1.body","72 h before the visit it sends the MyChart questionnaire and photo request, 48 h before it sends a reminder, and within 24 h it calls the patient (video if they agree, otherwise voice) to collect the answers.","72 h avant la visite, il envoie le questionnaire MyChart et la demande de photo; 48 h avant, un rappel; dans les 24 h, il appelle le patient (en vidéo s'il accepte, sinon par téléphone) pour recueillir les réponses.")
k("home.agent2.title","Clinical Decision Assistant","Assistant à la décision clinique")
k("home.agent2.body","Analyses the wound photo and the questionnaire, researches the Epic chart through MCP tools (history, OR note, labs) and calculates the Virtual-care Suitability Index with reasons and flags.","Analyse la photo de la plaie et le questionnaire, consulte le dossier Epic au moyen d'outils MCP (antécédents, protocole opératoire, analyses) et calcule l'indice d'aptitude aux soins virtuels avec motifs et signalements.")
k("home.apnDecides","AI recommends. The APN reviews the evidence and makes every decision.","L'IA recommande. L'IPA examine les données et prend chaque décision.")
k("home.openWorklist","Open the ACTU worklist","Ouvrir la liste de travail de l'UTCA")
k("home.openPatientApp","See the patients' phones","Voir les téléphones des patients")
k("home.setup","Setup status","État de la configuration")
k("home.check.dataSource","Data source","Source des données")
k("home.check.dataSource.epic","Epic on FHIR sandbox (live)","Bac à sable Epic on FHIR (en direct)")
k("home.check.dataSource.offline","Offline sample data","Données d'exemple hors ligne")
k("home.check.clinicianApp","Epic clinician app","Application clinicien Epic")
k("home.check.patientApp","Epic patient (MyChart) app","Application patient Epic (MyChart)")
k("home.check.claude","Claude API (both agents)","API Claude (les deux agents)")
k("home.check.mcp","MCP connection to the chart","Connexion MCP au dossier")
k("home.check.mcp.bridge","Built-in read-only Epic FHIR MCP bridge (stand-in for Epic's MCP connectors, announced for Q1 2027)","Passerelle MCP Epic FHIR intégrée en lecture seule (en attendant les connecteurs MCP d'Epic, annoncés pour le T1 2027)")
k("home.check.mcp.remote","Remote MCP server from EPIC_MCP_URL","Serveur MCP distant (EPIC_MCP_URL)")
k("home.check.redirect","Redirect URI to register in Epic (exact match): {uri}","URI de redirection à inscrire dans Epic (correspondance exacte) : {uri}")
k("home.check.missingEnv","Set {name} in .env","Définir {name} dans .env")
k("home.setupHelp","See README.md for the Epic app registration steps. Keys and client IDs go in .env, never in the code.","Voir README.md pour l'inscription des applications Epic. Les clés et identifiants vont dans .env, jamais dans le code.")

# Worklist
k("wl.title","ACTU follow-up worklist","Liste de travail des suivis de l'UTCA")
k("wl.lead","Upcoming ~2-week follow-ups after sternal wire–related procedures. Demo time: {now}","Suivis prévus environ 2 semaines après une intervention liée aux fils sternaux. Heure de la démo : {now}")
k("wl.signInNeeded","Sign in with your Epic account (sandbox) to see the worklist.","Connectez-vous avec votre compte Epic (bac à sable) pour voir la liste de travail.")
k("wl.demoControls","Demo controls","Commandes de démo")
k("wl.epicError","Some data could not be read from Epic:","Certaines données n'ont pu être lues dans Epic :")
k("wl.summary","Summary","Sommaire")
k("wl.tile.attention","Red flag or attention — awaiting APN","Signal d'alarme ou attention — en attente de l'IPA")
k("wl.tile.overdue","Overdue or unreached","En retard ou non joints")
k("wl.tile.callsDue","Agent calls due","Appels de l'agent à faire")
k("wl.tile.awaiting","Screened — awaiting APN decision","Dépistés — décision de l'IPA en attente")
k("wl.tile.decided","Decided","Décidés")
k("wl.caption","Patients in the virtual follow-up pathway, most urgent first","Patients du cheminement de suivi virtuel, du plus urgent au moins urgent")
k("wl.col.patient","Patient","Patient"); k("wl.col.visit","Follow-up visit","Visite de suivi"); k("wl.col.outreach","Outreach","Liaison")
k("wl.col.flags","Flags","Signalements"); k("wl.col.index","Index","Indice"); k("wl.col.decision","APN decision","Décision de l'IPA"); k("wl.col.action","Action","Action")
k("wl.synthetic","synthetic","synthétique")
k("wl.nameUnavailable","Not read from Epic","Non lu dans Epic")
k("wl.overdue","Overdue","En retard")
k("wl.hasMyChart","MyChart user","Utilisateur MyChart")
k("wl.noMyChart","No MyChart account","Aucun compte MyChart")
k("wl.redFlag","Red flag","Signal d'alarme")
k("wl.glycemia","Glycemia","Glycémie")
k("wl.readyForAssistant","Ready for assistant","Prêt pour l'assistant")
k("wl.noFlags","No flags","Aucun signalement")
k("wl.awaitingApn","Awaiting APN","En attente de l'IPA")
k("wl.review","Review","Examiner")
k("wl.reviewLabel","Review {name}","Examiner {name}")
k("wl.footnote","Names and demographics are read live from the Epic sandbox test patients. Procedures, dates, OR notes and wound photos are synthetic.","Les noms et données démographiques sont lus en direct dans les patients fictifs du bac à sable Epic. Les interventions, dates, protocoles opératoires et photos de plaies sont synthétiques.")

# Stages / events
for key,en,fr in [("scheduled","Scheduled","Planifié"),("awaiting_call","Awaiting call (no MyChart)","Appel à venir (sans MyChart)"),("invited","MyChart sent","MyChart envoyé"),("reminded","Reminder sent","Rappel envoyé"),("call_due","Agent call due","Appel de l'agent à faire"),("in_call","Call in progress","Appel en cours"),("completed","Screening complete","Dépistage terminé"),("unreached","Unreached — RN follow-up","Non joint — suivi infirmier")]:
    k(f"stage.{key}",en,fr)
for key,en,fr in [("invite_sent","MyChart questionnaire and photo request sent (V−72 h)","Questionnaire MyChart et demande de photo envoyés (V−72 h)"),("reminder_sent","MyChart reminder sent (V−48 h)","Rappel MyChart envoyé (V−48 h)"),("call_started","Agent call started","Appel de l'agent commencé"),("call_completed","Agent call completed — answers collected","Appel de l'agent terminé — réponses recueillies"),("call_unreached","Call not answered or declined","Appel sans réponse ou refusé"),("questionnaire_submitted","Questionnaire submitted in MyChart","Questionnaire soumis dans MyChart")]:
    k(f"event.{key}",en,fr)
for key,en,fr in [("invite","Next: MyChart questionnaire","Prochaine étape : questionnaire MyChart"),("reminder","Next: reminder if no response","Prochaine étape : rappel si aucune réponse"),("call","Next: agent call","Prochaine étape : appel de l'agent"),("visit","Follow-up visit","Visite de suivi")]:
    k(f"next.{key}",en,fr)

# Questionnaire
Q = [("wound_opening","Opening or gap in the incision?","Ouverture ou écart dans l'incision?","incision opening","ouverture de l'incision"),
     ("wound_drainage_redness","Drainage or spreading redness?","Écoulement ou rougeur qui s'étend?","drainage/redness","écoulement/rougeur"),
     ("wound_protruding","Protruding suture or wire?","Point de suture ou fil qui dépasse?","protruding suture/wire","suture/fil qui dépasse"),
     ("sym_fever","Fever or chills?","Fièvre ou frissons?","fever/chills","fièvre/frissons"),
     ("sym_chest_pain_sob","New or worse chest pain or shortness of breath?","Douleur thoracique nouvelle ou pire, ou essoufflement?","chest pain/SOB","douleur thoracique/essoufflement"),
     ("sym_dizzy_hr_bp","Dizziness or abnormal heart rate / blood pressure?","Étourdissements ou fréquence cardiaque / pression artérielle anormale?","dizziness/HR/BP","étourdissements/FC/PA"),
     ("pt_device_camera","Smartphone or tablet with a camera?","Téléphone intelligent ou tablette avec caméra?","no camera device","pas d'appareil avec caméra"),
     ("pt_internet","Reliable internet access?","Accès Internet fiable?","no reliable internet","pas d'Internet fiable"),
     ("pt_can_send_photo","Able to send a wound photo (alone or with help from family)?","Capable d'envoyer une photo de la plaie (seul ou avec l'aide de la famille)?","can't send photo","ne peut pas envoyer de photo"),
     ("pt_willing_video_phone","Willing to have a video or phone visit?","Prêt à avoir une visite par vidéo ou téléphone?","not willing (video/phone)","refuse vidéo/téléphone")]
for id_,en,fr,se,sf in Q:
    k(f"q.{id_}",en,fr); k(f"qshort.{id_}",se,sf)
k("section.wound","1 · Wound (from photo)","1 · Plaie (d'après la photo)")
k("section.symptoms","2 · Symptoms","2 · Symptômes")
k("section.patient","3 · Patient","3 · Patient")

# Findings / closure / comps / routes
for key,en,fr in [("incision_opening","Incision opening or gap","Ouverture ou écart de l'incision"),("drainage","Drainage","Écoulement"),("spreading_redness","Spreading redness","Rougeur qui s'étend"),("protruding_suture_or_wire","Protruding suture or wire","Suture ou fil qui dépasse")]:
    k(f"finding.{key}",en,fr)
k("closure.absorbable","Absorbable closure — no sutures to remove","Fermeture résorbable — aucune suture à retirer")
k("closure.retention_or_stay_sutures","Retention/stay sutures — removal needed","Sutures de rétention — retrait nécessaire")
k("closure.unknown","Closure method unknown","Méthode de fermeture inconnue")
for key,en,fr in [("noQuestionnaireRedFlags","No questionnaire red flags","Aucun signal d'alarme au questionnaire"),("woundPhotoReassuring","Wound photo reassuring","Photo de la plaie rassurante"),("noHandsOnNeed","No hands-on need (absorbable closure)","Aucun soin manuel requis (fermeture résorbable)"),("digitalReadiness","Digital readiness","Préparation numérique"),("dataCompleteness","Complete data","Données complètes")]:
    k(f"comp.{key}",en,fr)
R = [("virtual_visit","Virtual visit with the APN (video or phone)","Visite virtuelle avec l'IPA (vidéo ou téléphone)","No sutures to remove and no red flags; surgeon reviews the photo.","Aucune suture à retirer ni signal d'alarme; le chirurgien examine la photo."),
     ("phone_visit_or_local_support","Phone visit or local support","Visite téléphonique ou soutien local","For patients without a device, internet or ability to send a photo.","Pour les patients sans appareil, Internet ou capacité d'envoyer une photo."),
     ("local_suture_removal_plus_apn_check","Local suture removal + short APN virtual check","Retrait local des sutures + brève vérification virtuelle par l'IPA","Family physician, community nurse (Ontario Health atHome) or CLSC removes the sutures close to home.","Le médecin de famille, une infirmière communautaire (Santé à domicile Ontario) ou le CLSC retire les sutures près du domicile."),
     ("in_person_actu","In-person ACTU visit","Visite en personne à l'UTCA","Examination or treatment needed; sutures removed at the same visit if present.","Examen ou traitement nécessaire; sutures retirées à la même visite s'il y a lieu."),
     ("phone_advice","Phone advice (APN)","Conseils téléphoniques (IPA)","Minor issue the APN can manage remotely, with a low threshold to bring the patient in.","Problème mineur que l'IPA peut gérer à distance, avec un seuil bas pour faire venir le patient.")]
for id_,en,fr,he,hf in R:
    k(f"route.{id_}",en,fr); k(f"routeHelp.{id_}",he,hf)

# Flags / glycemia
k("flag.redQ","patient reported {items}","le patient signale : {items}")
k("flag.redPhoto","photo shows {items}","la photo montre : {items}")
k("flag.glycemia","glycemic control — {reasons}","contrôle glycémique — {reasons}")
k("flag.qIncomplete","questionnaire incomplete","questionnaire incomplet")
k("flag.photoMissing","no usable wound photo","aucune photo de plaie utilisable")
k("flag.closureUnknown","closure method not found in the OR note","méthode de fermeture absente du protocole opératoire")
k("gly.hba1c","HbA1c {v}% on {d} (above 7.0% target)","HbA1c {v} % le {d} (au-dessus de la cible de 7,0 %)")
k("gly.glucose","glucose {v} mmol/L on {d} (above 10.0)","glycémie {v} mmol/L le {d} (au-dessus de 10,0)")
k("gly.coded","diagnosis coded as {text}","diagnostic codé : {text}")
k("gly.noRecent","diabetic, last HbA1c {d} (over 6 months) — control unknown","diabétique, dernière HbA1c le {d} (plus de 6 mois) — contrôle inconnu")
k("gly.none","diabetic, no HbA1c on file — control unknown","diabétique, aucune HbA1c au dossier — contrôle inconnu")

# Patient review
k("pr.back","Back to worklist","Retour à la liste de travail")
k("pr.age","{age} y","{age} ans")
k("sex.male","Male","Homme"); k("sex.female","Female","Femme"); k("sex.other","Other","Autre"); k("sex.unknown","Unknown","Inconnu")
k("pr.on","on","le")
k("pr.visit","Follow-up visit","Visite de suivi")
k("pr.distance","{km} km from UOHI (synthetic)","À {km} km de l'ICUO (synthétique)")
k("pr.patientUnavailable","Patient record could not be read from Epic. Showing the enrollment's sandbox name.","Le dossier du patient n'a pu être lu dans Epic. Affichage du nom du bac à sable.")
k("pr.outreach","Outreach (Agent 1)","Liaison (agent 1)")
k("pr.noOutreach","No outreach yet.","Aucune liaison pour l'instant.")
k("pr.answers","Pre-visit questionnaire","Questionnaire avant la visite")
k("pr.noAnswers","Not completed yet.","Pas encore rempli.")
k("pr.answersSource","Collected via {source}.","Recueilli par {source}.")
k("source.mychart","MyChart (patient self-report)","MyChart (déclaration du patient)")
k("source.call","the outreach agent's call","l'appel de l'agent de liaison")
k("pr.photo","Wound photo","Photo de la plaie")
k("pr.photoAlt","Synthetic sternotomy incision photo for this patient","Photo synthétique de l'incision de sternotomie de ce patient")
k("pr.photoSource","Received via {source}. Synthetic demonstration image.","Reçue par {source}. Image de démonstration synthétique.")
k("pr.noPhoto","No photo received.","Aucune photo reçue.")
k("pr.writes","Epic write-back","Écriture dans Epic")
k("pr.noWrites","Nothing filed yet.","Rien de déposé pour l'instant.")
k("pr.audit","Audit trail","Piste de vérification")
k("write.created","filed in Epic","déposé dans Epic"); k("write.failed","Epic refused — kept locally","refusé par Epic — conservé localement"); k("write.local_only","kept locally","conservé localement")
for key,en,fr in [("clinician","Clinician","Clinicien"),("patient","Patient","Patient"),("system","System","Système"),("outreach","Outreach agent","Agent de liaison"),("decision-assistant","Decision assistant","Assistant à la décision")]:
    k(f"actor.{key}",en,fr)
for key,en,fr in [("sternal_wire_removal","Sternal wire removal","Retrait de fils sternaux"),("sternal_rewiring_fixation","Sternal rewiring with fixation","Recerclage sternal avec fixation"),("sternal_debridement_closure","Sternal wound debridement and closure","Débridement et fermeture de plaie sternale"),("sternal_wire_tightening","Sternal wire tightening","Resserrement de fils sternaux")]:
    k(f"proc.{key}",en,fr)

# Assistant
k("as.title","Clinical Decision Assistant (Agent 2)","Assistant à la décision clinique (agent 2)")
k("as.what","Reviews the photo, the answers and the Epic chart (through MCP tools), then calculates the Virtual-care Suitability Index. It does not decide.","Examine la photo, les réponses et le dossier Epic (au moyen d'outils MCP), puis calcule l'indice d'aptitude aux soins virtuels. Il ne décide pas.")
k("as.noKey","The Claude API key is not configured (ANTHROPIC_API_KEY), so the agents are unavailable.","La clé de l'API Claude n'est pas configurée (ANTHROPIC_API_KEY); les agents ne sont pas disponibles.")
k("as.notReady","Waiting for the pre-visit questionnaire.","En attente du questionnaire avant la visite.")
k("as.run","Run assistant","Lancer l'assistant"); k("as.rerun","Run again","Relancer"); k("as.runningBtn","Working…","En cours…")
k("as.running","Assistant started.","Assistant lancé.")
k("as.finished","Assistant finished.","Assistant terminé.")
k("as.progress","Assistant progress","Progression de l'assistant")
k("as.liveTrace","Live MCP tool calls","Appels d'outils MCP en direct")
for key,en,fr in [("photo","Reviewing the wound photo","Examen de la photo de la plaie"),("chart","Researching the Epic chart via MCP","Consultation du dossier Epic par MCP"),("glycemia","Checking glycemic control","Vérification du contrôle glycémique"),("index","Calculating the Suitability Index","Calcul de l'indice d'aptitude")]:
    k(f"as.step.{key}",en,fr)
for key,en,fr in [("idle","waiting","en attente"),("run","in progress","en cours"),("done","done","terminé"),("skip","skipped","sauté")]:
    k(f"as.state.{key}",en,fr)
k("as.index","Virtual-care Suitability Index","Indice d'aptitude aux soins virtuels")
k("as.indexAria","Suitability index {score} out of 100","Indice d'aptitude {score} sur 100")
k("as.illustrative","Illustrative — not a validated model. The breakdown below shows where every point comes from.","Illustratif — modèle non validé. La ventilation ci-dessous montre l'origine de chaque point.")
k("as.flags","Flags for APN attention","Signalements pour l'attention de l'IPA")
k("as.noFlags","No red flags or attention flags.","Aucun signal d'alarme ni signalement.")
k("as.redFlag","Red flag","Signal d'alarme"); k("as.attention","Attention","Attention"); k("as.dataGap","Data gap","Donnée manquante")
k("as.photoReview","Wound photo review (AI)","Examen de la photo de la plaie (IA)")
k("as.present","Present","Présent"); k("as.absent","Absent","Absent")
k("as.chart","Chart review (AI, via MCP)","Revue du dossier (IA, par MCP)")
k("as.closure","Closure","Fermeture"); k("as.source","Source","Source")
k("as.history","Relevant history","Antécédents pertinents"); k("as.meds","Medications of note","Médicaments à noter"); k("as.gaps","Data gaps","Données manquantes")
k("as.trace","Tool trace ({n} MCP calls)","Trace des outils ({n} appels MCP)")
k("as.via","Via {transport} · model {model}","Par {transport} · modèle {model}")

# Decision
k("dec.title","APN decision","Décision de l'IPA")
k("dec.help","Choose the follow-up. The assistant's suggestion is marked; you decide.","Choisissez le suivi. La suggestion de l'assistant est indiquée; c'est vous qui décidez.")
k("dec.legend","Follow-up option","Option de suivi")
k("dec.suggested","Assistant suggestion","Suggestion de l'assistant")
k("dec.distance","Patient lives {km} km from UOHI.","Le patient habite à {km} km de l'ICUO.")
k("dec.note","Note (optional)","Note (facultative)")
k("dec.submit","Record decision","Enregistrer la décision"); k("dec.update","Update decision","Mettre à jour la décision")
k("dec.existing","Recorded by {by}.","Enregistrée par {by}.")
k("dec.choose","Choose a follow-up option.","Choisissez une option de suivi.")
k("dec.savedEpic","Decision recorded and filed in Epic as a clinical note.","Décision enregistrée et déposée dans Epic comme note clinique.")
k("dec.savedLocal","Decision recorded. Not filed in Epic: {note}","Décision enregistrée. Non déposée dans Epic : {note}")

# Patient phones
k("ph.title","Patients' phones (simulated)","Téléphones des patients (simulés)")
k("ph.lead","What the Outreach Agent has sent each patient so far. Demo time: {now}","Ce que l'agent de liaison a envoyé à chaque patient jusqu'ici. Heure de la démo : {now}")
k("ph.phoneOf","Phone of {name}","Téléphone de {name}")
k("ph.portal","MyChart","MyChart"); k("ph.phone","Phone","Téléphone")
k("ph.simulated","Simulated screen — Epic has no API for outbound MyChart notifications","Écran simulé — Epic n'offre pas d'API pour les notifications MyChart sortantes")
k("ph.visit","Follow-up visit: {when}","Visite de suivi : {when}")
k("ph.incoming","Incoming call","Appel entrant")
k("ph.incomingFrom","ACTU automated pre-visit assistant","Assistant automatisé avant la visite de l'UTCA")
k("ph.answer","Answer","Répondre")
k("ph.inviteTitle","Pre-visit check-in from your care team","Questionnaire avant la visite de votre équipe de soins")
k("ph.inviteBody","Please complete your pre-visit questionnaire and upload a photo of your incision.","Veuillez remplir votre questionnaire avant la visite et téléverser une photo de votre incision.")
k("ph.reminderTitle","Reminder: pre-visit check-in","Rappel : questionnaire avant la visite")
k("ph.reminderBody","Your follow-up is in 2 days. Please complete the questionnaire and photo.","Votre suivi a lieu dans 2 jours. Veuillez remplir le questionnaire et envoyer la photo.")
k("ph.openCheckin","Open check-in","Ouvrir le questionnaire")
k("ph.nothingYet","No messages yet.","Aucun message pour l'instant.")
k("ph.noPortal","No MyChart account — the agent will call within 24 hours of the visit.","Aucun compte MyChart — l'agent appellera dans les 24 heures précédant la visite.")
k("ph.thanks","Thank you. Your answers were sent to your care team.","Merci. Vos réponses ont été transmises à votre équipe de soins.")
k("ph.missed","Missed call. A nurse will follow up.","Appel manqué. Une infirmière fera le suivi.")
k("ph.allPhones","All patient phones","Tous les téléphones des patients")
k("ph.signInPrompt","Sign in to MyChart to complete your check-in.","Connectez-vous à MyChart pour remplir votre questionnaire.")
k("ph.signIn","Sign in with MyChart","Se connecter avec MyChart")
k("ph.signInHint","Epic sandbox test account for this patient: {user} (password on Epic's sandbox test-data page).","Compte de test du bac à sable Epic pour ce patient : {user} (mot de passe sur la page de données de test d'Epic).")
k("ph.wrongPatient","You are signed in to MyChart as a different test patient. Sign in as this patient.","Vous êtes connecté à MyChart comme un autre patient fictif. Connectez-vous en tant que ce patient.")
k("ci.title","Pre-visit check-in","Questionnaire avant la visite")
k("ci.intro","Answer each question. Your care team reviews your answers before your visit. If you have an emergency, call 911.","Répondez à chaque question. Votre équipe de soins examine vos réponses avant votre visite. En cas d'urgence, composez le 911.")
k("ci.photo","Photo of your incision","Photo de votre incision")
k("ci.photoHelp","Demo: choose a synthetic photo (no real patient images are used).","Démo : choisissez une photo synthétique (aucune image de vrai patient n'est utilisée).")
k("ci.suggested","Suggested for this demo patient: {name}.","Suggérée pour ce patient de démo : {name}.")
k("ci.submit","Send to my care team","Envoyer à mon équipe de soins")
k("ci.missing","Please answer all questions ({n} left).","Veuillez répondre à toutes les questions (il en reste {n}).")
k("ci.sentEpic","Sent. Your answers were filed in Epic.","Envoyé. Vos réponses ont été déposées dans Epic.")
k("ci.sentLocal","Sent to your care team. Not filed in Epic: {note}","Envoyé à votre équipe de soins. Non déposé dans Epic : {note}")
for key,en,fr in [("wound-healing.jpg","Healing well","Bonne guérison"),("wound-retention-sutures.jpg","Retention sutures in place","Sutures de rétention en place"),("wound-redness-drainage.jpg","Redness and drainage","Rougeur et écoulement"),("wound-gap.jpg","Gap in the incision","Écart dans l'incision"),("wound-protruding-wire.jpg","Protruding wire","Fil qui dépasse")]:
    k(f"photo.{key}",en,fr)

# Call
k("call.title","Agent call — {name}","Appel de l'agent — {name}")
k("call.lead","The Outreach Agent calls patients who have not completed the check-in within 24 hours of the visit. It only collects answers and, with consent, a photo over video.","L'agent de liaison appelle les patients qui n'ont pas rempli le questionnaire dans les 24 heures précédant la visite. Il recueille seulement les réponses et, avec consentement, une photo par vidéo.")
k("call.needClinician","The agent calls on behalf of the ACTU. Sign in with Epic as the clinician first.","L'agent appelle au nom de l'UTCA. Connectez-vous d'abord à Epic comme clinicien.")
k("call.videoArea","Call video","Vidéo de l'appel")
k("call.cameraFeed","Patient camera","Caméra du patient")
k("call.syntheticFeed","Synthetic camera feed showing a sternotomy incision","Flux de caméra synthétique montrant une incision de sternotomie")
k("call.ringing","Calling the patient…","Appel du patient…")
k("call.voiceOnly","Voice call","Appel vocal")
k("call.ended","Call ended","Appel terminé")
k("call.videoOn","Video on","Vidéo activée")
k("call.feed","Patient camera (demo)","Caméra du patient (démo)")
k("call.feedSynthetic","Synthetic feed (recommended for the demo)","Flux synthétique (recommandé pour la démo)")
k("call.feedPick","Synthetic image","Image synthétique")
k("call.feedCamera","This device's camera","Caméra de cet appareil")
k("call.cameraDenied","Camera not available — using the synthetic feed.","Caméra indisponible — utilisation du flux synthétique.")
k("call.voiceOut","Agent speaks aloud","L'agent parle à voix haute")
k("call.autoListen","Listen automatically after the agent speaks","Écouter automatiquement après l'agent")
k("call.progress","{n} of {total} answers collected","{n} réponses recueillies sur {total}")
k("call.incoming","The agent is calling the patient. Answer as the patient.","L'agent appelle le patient. Répondez comme le patient.")
k("call.decline","Decline / no answer","Refuser / sans réponse")
k("call.connecting","Connecting…","Connexion…")
k("call.transcript","Call transcript","Transcription de l'appel")
k("call.agent","Agent","Agent"); k("call.patient","Patient","Patient")
k("call.speak","Speak","Parler"); k("call.listening","Listening…","À l'écoute…")
k("call.typeLabel","Type the patient's reply","Tapez la réponse du patient")
k("call.typePlaceholder","Or type the patient's reply…","Ou tapez la réponse du patient…")
k("call.send","Send","Envoyer")
k("call.noStt","Speech recognition is not available in this browser — use the buttons or type. (Chrome or Edge support it.)","La reconnaissance vocale n'est pas offerte dans ce navigateur — utilisez les boutons ou tapez. (Chrome ou Edge la prennent en charge.)")
k("call.micError","Microphone error: {err}","Erreur de microphone : {err}")
k("call.photoSent","[Photo captured from the video]","[Photo prise à partir de la vidéo]")
k("call.done","Call complete. The answers were sent to the ACTU worklist for the Clinical Decision Assistant and the APN.","Appel terminé. Les réponses ont été transmises à la liste de travail de l'UTCA pour l'assistant et l'IPA.")
k("call.unreached","The patient was not reached. The ACTU nurse will follow up.","Le patient n'a pas été joint. L'infirmière de l'UTCA fera le suivi.")
k("call.toReview","Open the APN review","Ouvrir l'examen de l'IPA")

# Demo
k("demo.title","Demo controls","Commandes de démonstration")
k("demo.lead","Fast-forward the clock to show the Outreach Agent's 72 h / 48 h / 24 h steps. All follow-up visits are scheduled at the same time.","Avancez l'horloge pour montrer les étapes de 72 h / 48 h / 24 h de l'agent de liaison. Toutes les visites de suivi ont lieu au même moment.")
k("demo.clock","Demo clock","Horloge de la démo")
k("demo.now","Now","Maintenant"); k("demo.visit","Follow-up visits","Visites de suivi")
k("demo.hoursToVisit","{h} h before the visit","{h} h avant la visite")
k("demo.jump","Jump to V−{h} h","Aller à V−{h} h")
k("demo.fileOrNotes","File synthetic OR notes to Epic","Déposer les protocoles opératoires synthétiques dans Epic")
k("demo.checkMcp","Check Epic data via MCP","Vérifier les données Epic par MCP")
k("demo.reset","Reset demo","Réinitialiser la démo")
k("demo.resetConfirm","Reset the demo? This clears answers, photos, assistant results and decisions (the audit log is kept).","Réinitialiser la démo? Les réponses, photos, résultats de l'assistant et décisions seront effacés (la piste de vérification est conservée).")
k("demo.signInForNotes","Sign in with Epic to file the OR notes.","Connectez-vous à Epic pour déposer les protocoles opératoires.")
k("demo.done","Done.","Terminé.")
k("demo.orNotes","Synthetic OR notes","Protocoles opératoires synthétiques")
k("demo.orNotesHelp","The sandbox patients have no sternal wire procedure, so a synthetic OR note is written for each. Filing it to Epic (DocumentReference.Create) lets the assistant read it back through FHIR. If Epic refuses, the assistant reads the local copy and says so.","Les patients du bac à sable n'ont pas d'intervention aux fils sternaux; un protocole opératoire synthétique est donc rédigé pour chacun. Le déposer dans Epic (DocumentReference.Create) permet à l'assistant de le relire par FHIR. Si Epic refuse, l'assistant lit la copie locale et le précise.")
k("demo.orInEpic","In Epic","Dans Epic"); k("demo.orLocal","Local copy","Copie locale"); k("demo.orNotFiled","Not filed","Non déposé")
k("demo.script","Suggested demo script","Scénario de démonstration suggéré")
steps = [
 ("Sign in with Epic (sandbox clinician FHIRTWO). Open the worklist: four test patients, names read live from Epic.","Connectez-vous à Epic (clinicien FHIRTWO du bac à sable). Ouvrez la liste de travail : quatre patients fictifs, noms lus en direct dans Epic."),
 ("Jump to V−72 h: the Outreach Agent sends the MyChart questionnaire to the three patients with MyChart.","Allez à V−72 h : l'agent de liaison envoie le questionnaire MyChart aux trois patients qui ont MyChart."),
 ("Camila completes the check-in on her phone (MyChart sandbox login fhircamila, photo 'Healing well'). Desiree reports drainage (photo 'Redness and drainage').","Camila remplit le questionnaire sur son téléphone (connexion MyChart fhircamila, photo « Bonne guérison »). Desiree signale un écoulement (photo « Rougeur et écoulement »)."),
 ("Jump to V−48 h: Derrick hasn't responded, so he gets a reminder.","Allez à V−48 h : Derrick n'a pas répondu et reçoit un rappel."),
 ("Jump to V−24 h: the agent calls Derrick. He agrees to video and shows his incision (retention sutures). Warren (no MyChart) gets a voice call.","Allez à V−24 h : l'agent appelle Derrick. Il accepte la vidéo et montre son incision (sutures de rétention). Warren (sans MyChart) reçoit un appel vocal."),
 ("Open Camila in the worklist and run the Clinical Decision Assistant: watch the MCP tool calls, then the index and flags.","Ouvrez Camila dans la liste et lancez l'assistant : observez les appels d'outils MCP, puis l'indice et les signalements."),
 ("The APN chooses the follow-up and records it; the note is filed in Epic and the audit trail updates. Contrast with Desiree (red flag) and Derrick (suture options).","L'IPA choisit le suivi et l'enregistre; la note est déposée dans Epic et la piste de vérification se met à jour. Comparez avec Desiree (signal d'alarme) et Derrick (options de retrait des sutures)."),
]
for i,(en,fr) in enumerate(steps,1): k(f"demo.step{i}",en,fr)
k("demo.audit","Audit log (latest)","Piste de vérification (récente)")
k("demo.audit.time","Time","Heure"); k("demo.audit.actor","Who","Qui"); k("demo.audit.action","Action","Action"); k("demo.audit.enrollment","Enrollment","Inscription")

assert set(E)==set(F)
import os
out=sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','lib','i18n')
json.dump(E,open(f"{out}/en.json","w"),ensure_ascii=False,indent=1,sort_keys=True)
json.dump(F,open(f"{out}/fr.json","w"),ensure_ascii=False,indent=1,sort_keys=True)
print(len(E),"keys")
