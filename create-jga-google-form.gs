/**
 * Erstellt die fertige Google-Forms-Abstimmung für den JGA.
 *
 * Verwendung:
 * 1. https://script.google.com/ öffnen und ein neues Projekt erstellen.
 * 2. Den Inhalt dieser Datei in Code.gs einfügen.
 * 3. createJgaChallengePoll ausführen und den Google-Zugriff bestätigen.
 * 4. Unter "Ausführungsprotokoll" den Teilnahmelink kopieren.
 */
function createJgaChallengePoll() {
  const form = FormApp.create('JGA – Aufgaben-Voting');

  form
    .setDescription(
      'Wir wollen den Bräutigam nicht mit Aufgaben überladen und gemeinsam die besten aussuchen.\n\n' +
      'Kreuze in allen Kategorien einfach jede Aufgabe an, die du gut findest. Es gibt keine Mindest- oder Höchstzahl an Stimmen. Anschließend stellen wir anhand der Ergebnisse eine ausgewogene Auswahl zusammen.\n\n' +
    )
    .setConfirmationMessage(
      'Danke für deine Abstimmung! Deine Favoriten wurden gespeichert.'
    )
    .setProgressBar(false)
    .setShuffleQuestions(false);

  form
    .addTextItem()
    .setTitle('Dein Name')
    .setHelpText('Damit wir sehen können, wer bereits abgestimmt hat.')
    .setRequired(true);

  const interactionTasks = [
    'Ein Fußballduell gewinnen',
    'Mit einem Zaubertrick jemanden zum Staunen bringen',
    'Trade-up-Challenge: Mit einem kleinen Gegenstand beginnen und einen festgelegten Coolness-Wert erreichen',
    'Respektvoll drei Telefonnummern oder Instagram-Kontakte klären',
    'Fünf Doppelgänger von ihm, euch oder seinem Umfeld finden und mit Erlaubnis gemeinsame Fotos machen',
    'Einen Witz erzählen, der jemanden zum Lachen bringt',
    'Ein Armdrückduell gewinnen',
    'Ein Liegestützduell gewinnen',
    'Mit Erlaubnis kurz den Job eines Straßenkünstlers übernehmen',
    'Dreimal anderen Leuten helfen',
    'Leute festgelegte Wörter sagen lassen, ohne diese selbst zu verwenden',
    'Fünfmal einen harmlosen „Reingeguckt“-/„Du hast da was“-Prank schaffen',
    'Eine komplette Unterhaltung auf Englisch führen, obwohl die andere Person offensichtlich Deutsch kann',
    'In jedem Restaurant oder Imbiss freundlich nach etwas fragen, das nicht auf der Karte steht',
    'Dreimal Schere–Stein–Papier um einen Schnaps oder ein alkoholfreies Getränk gewinnen',
    'Für 30 Minuten zu harmlosen Fragen von Randoms nicht „Nein“ sagen – persönlicher Veto-Joker gilt immer',
    'Ein Flunkyball-Duell organisieren und gewinnen'
  ];

  const noInteractionTasks = [
    'Überall, wo es Bier gibt, ein Bier oder eine alkoholfreie Alternative kaufen und trinken – erst nach dem Fahr-/Actionprogramm',
    'Etwas sehr Scharfes essen',
    'Eine einvernehmliche Schellenwette gewinnen',
    'Etwas machen, das den „Thug-Life-Stock“ verdient hätte',
    'Zwei Colabier oder alkoholfreie Alternativen nacheinander exen',
    'Von jedem aus der Gruppe eine „Wenn ich du wäre“-Aufgabe erledigen',
    'An jede Hand eine Dose Bier oder ein alkoholfreies Getränk tapen lassen und in eigenem Tempo austrinken',
    'Einen coolen, sicheren und vorher abgesprochenen Stunt machen',
    'Ein Sprintduell auf einer freien und sicheren Strecke statt durch eine Menschenmenge gewinnen',
    'Mindestens 100 € Glücksspielgewinn erzielen – nur mit einem vorher festgelegten kleinen Maximaleinsatz',
    'Nüchtern und nur an einer sicheren, geeigneten Stelle auf einen Baum klettern'
  ];

  const activityTasks = [
    'Jedem Instruktor eine Frage stellen, die er direkt davor bereits beantwortet hat',
    'In einer der Kart-Sessions die schnellste Runde fahren',
    'Beim Kartfahren ein cooles Überholmanöver schaffen',
    'Das Team-Duell gewinnen',
    'Beim Team-Duell zwei einzelne Runden für das Team holen',
    'Dreimal ein Udo-Lindenberg-Lied singen – im Kostüm',
    'Zusammen mit der ganzen Karaokebar einen Song singen',
    'Beim Paintball eine Vierer-Abschussserie schaffen',
    'Beim Paintball einen Abschuss aus über 50 Metern Entfernung schaffen',
    'Eine Unterschrift von einem HSV-Spieler oder -Funktionär bekommen',
    'Das Ergebnis von RBL gegen HSV richtig tippen'
  ];

  form
    .addCheckboxItem()
    .setTitle('🎭 Interaktionen mit Randoms')
    .setHelpText('Wähle alle Aufgaben, die du gut findest.')
    .setChoiceValues(interactionTasks)
    .setRequired(false);

  form
    .addCheckboxItem()
    .setTitle('🍻 Challenges ohne direkte Interaktion mit Randoms')
    .setHelpText('Wähle alle Aufgaben, die du gut findest.')
    .setChoiceValues(noInteractionTasks)
    .setRequired(false);

  form
    .addCheckboxItem()
    .setTitle('🏁 Aufgaben passend zu unseren Aktivitäten')
    .setHelpText('Wähle alle Aufgaben, die du gut findest.')
    .setChoiceValues(activityTasks)
    .setRequired(false);

  console.log('Teilnahmelink: ' + form.getPublishedUrl());
  console.log('Bearbeitungslink: ' + form.getEditUrl());
}
