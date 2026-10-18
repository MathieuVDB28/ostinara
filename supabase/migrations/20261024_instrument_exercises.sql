-- Migration: les exercices des autres instruments
--
-- Premiere serie d'exercices systeme pour la batterie, la basse et le
-- clavier, plus quelques exercices de mise en place valables pour tous
-- (instruments = '{}'). Les categories ont ete ajoutees a l'enum dans la
-- migration precedente : a appliquer apres elle, separement.
--
-- Idempotent : un exercice systeme du meme nom n'est pas reinsere.

INSERT INTO exercises (
  name, description, category, difficulty,
  starting_bpm, target_bpm, bpm_increment, time_signature,
  instructions, tips, duration_minutes, is_system, instruments
)
SELECT v.name, v.description, v.category::exercise_category, v.difficulty::exercise_difficulty,
       v.starting_bpm, v.target_bpm, v.bpm_increment, v.time_signature,
       v.instructions, v.tips, v.duration_minutes, TRUE, v.instruments::instrument[]
FROM (VALUES
  -- =========================================================
  -- Batterie
  -- =========================================================
  ('Single stroke roll', 'Le rudiment de base : une main après l''autre, parfaitement égales.', 'rudiments', 'beginner',
   60, 160, 5, '4/4',
   ARRAY['Sur un pad ou la caisse claire, joue D G D G en doubles croches', 'Les deux baguettes partent de la même hauteur', 'Garde le même volume sur chaque coup', 'Recommence en partant de la main gauche'],
   ARRAY['Laisse la baguette rebondir, ne l''écrase pas sur la peau', 'Enregistre-toi : les deux mains doivent sonner pareil', 'Épaules et poignets relâchés'],
   5, '{drums}'),

  ('Double stroke roll', 'Deux coups par main, le roulement qui fluidifie tout le reste.', 'rudiments', 'beginner',
   50, 130, 5, '4/4',
   ARRAY['Joue D D G G en doubles croches', 'Le deuxième coup de chaque main doit être aussi fort que le premier', 'Commence lentement avec deux vrais coups de poignet', 'En accélérant, laisse le rebond faire le deuxième coup'],
   ARRAY['Le deuxième coup est souvent trop faible : accentue-le volontairement', 'Travaille aussi en triolets (D D G G D D sur deux temps)'],
   5, '{drums}'),

  ('Paradiddle', 'D G D D – G D G G : le rudiment qui mène aux grooves et aux breaks.', 'rudiments', 'intermediate',
   60, 140, 5, '4/4',
   ARRAY['Joue D G D D G D G G en doubles croches', 'Accentue la première note de chaque groupe', 'Les notes non accentuées restent basses, près de la peau', 'Puis déplace la main droite sur le charleston pour en faire un groove'],
   ARRAY['Pense « accent haut, notes fantômes basses » : c''est le contraste qui compte', 'Dis le rudiment à voix haute au début'],
   5, '{drums}'),

  ('Flam et flam tap', 'Deux baguettes presque ensemble : la petite note juste avant la grosse.', 'rudiments', 'intermediate',
   50, 110, 5, '4/4',
   ARRAY['Une baguette basse (petite note), l''autre haute (note principale)', 'Les deux tombent presque en même temps, la basse un poil avant', 'Alterne : flam droit, flam gauche', 'Puis flam tap : flam suivi d''un coup simple de la même main'],
   ARRAY['Si tu entends un seul coup, les hauteurs de baguettes sont trop proches', 'Si tu en entends deux distincts, rapproche-les'],
   5, '{drums}'),

  ('Groove rock de base', 'Charleston en croches, grosse caisse sur 1 et 3, caisse claire sur 2 et 4.', 'grooves', 'beginner',
   70, 130, 5, '4/4',
   ARRAY['Main droite : croches régulières au charleston fermé', 'Pied droit : grosse caisse sur les temps 1 et 3', 'Main gauche : caisse claire sur les temps 2 et 4', 'Boucle quatre mesures sans t''arrêter'],
   ARRAY['Le charleston doit rester parfaitement régulier, même au moment de la caisse claire', 'Compte à voix haute « 1 et 2 et… »'],
   10, '{drums}'),

  ('Groove shuffle', 'Le balancement en triolets du blues et du rock''n''roll.', 'grooves', 'intermediate',
   60, 120, 5, '4/4',
   ARRAY['Compte des triolets : « 1 trip let 2 trip let »', 'Charleston sur la première et la troisième note de chaque triolet', 'Caisse claire sur 2 et 4, grosse caisse sur 1 et 3', 'Ajoute ensuite des notes fantômes sur la note du milieu'],
   ARRAY['Règle le métronome en triolets pour sentir la subdivision', 'Le shuffle doit balancer, pas courir'],
   10, '{drums}'),

  ('Breaks d''un temps sur les toms', 'Trois mesures de groove, un break, et retomber pile sur le 1.', 'fills', 'beginner',
   60, 120, 5, '4/4',
   ARRAY['Joue trois mesures du groove rock de base', 'Sur le dernier temps de la quatrième mesure, quatre doubles croches sur les toms', 'Retombe sur une cymbale crash + grosse caisse au temps 1', 'Varie l''ordre des toms à chaque tour'],
   ARRAY['Le break ne doit ni accélérer ni ralentir le tempo', 'Le plus important, c''est la retombée sur le 1'],
   10, '{drums}'),

  ('Indépendance : grosse caisse libre', 'La main droite ne bouge pas, le pied se promène.', 'independence', 'intermediate',
   60, 110, 5, '4/4',
   ARRAY['Charleston en croches et caisse claire sur 2 et 4, en boucle', 'Place la grosse caisse sur le « et » du 2, puis du 3, puis du 4', 'Une variation par ligne de quatre mesures', 'Termine en combinant deux placements'],
   ARRAY['Si le charleston bégaie, ralentis : c''est lui la référence', 'Écris tes variations préférées pour les réutiliser'],
   10, '{drums}'),

  ('Double pédale en doubles croches', 'Endurance et régularité des deux pieds.', 'technique', 'advanced',
   80, 180, 5, '4/4',
   ARRAY['Pied droit, pied gauche en doubles croches régulières', 'Une mesure de jeu, une mesure de repos', 'Puis quatre mesures d''affilée', 'Ajoute une caisse claire sur 2 et 4 par-dessus'],
   ARRAY['Joue avec la plante du pied, talon levé', 'Règle la tension des ressorts identique des deux côtés'],
   10, '{drums}'),

  -- =========================================================
  -- Basse
  -- =========================================================
  ('Gamme majeure sur deux octaves', 'La gamme de référence, en une position puis en se déplaçant.', 'scales', 'beginner',
   60, 120, 5, '4/4',
   ARRAY['Pars de la tonique sur la corde de Mi (ex. Sol, case 3)', 'Doigté 1-2-4 / 1-2-4 / 1-3-4, un doigt par case', 'Monte puis descends en croches', 'Change de tonalité à chaque série'],
   ARRAY['Alterne index et majeur à la main droite, sans jamais répéter le même doigt', 'Étouffe les cordes graves avec le pouce'],
   5, '{bass}'),

  ('Pentatonique mineure en boîte', 'La gamme des lignes rock, blues et funk.', 'scales', 'beginner',
   60, 130, 5, '4/4',
   ARRAY['Joue la pentatonique de La mineur à partir de la case 5', 'Montée et descente en croches', 'Puis par groupes de trois notes', 'Improvise une ligne simple sur deux notes de la gamme'],
   ARRAY['Vise la fondamentale sur le temps 1', 'Laisse sonner, ne coupe pas les notes trop tôt'],
   5, '{bass}'),

  ('Fondamentale en croches, calée au clic', 'La base du job de bassiste : tenir le tempo avec le batteur.', 'grooves', 'beginner',
   70, 140, 5, '4/4',
   ARRAY['Croches régulières sur la fondamentale : La, Ré, Mi, une mesure chacun', 'Règle le métronome pour ne jouer que sur 2 et 4 (mode silence)', 'Cherche à tomber pile avec le clic', 'Varie la longueur des notes : liées, puis piquées'],
   ARRAY['La régularité compte plus que les notes', 'Écoute la fin de chaque note autant que son début'],
   10, '{bass}'),

  ('Fondamentale, quinte, octave', 'Le motif qui marche sur presque toutes les grilles.', 'grooves', 'beginner',
   70, 130, 5, '4/4',
   ARRAY['Fondamentale sur le 1, quinte sur le 2, octave sur le 3, quinte sur le 4', 'Enchaîne sur une grille Do – La mineur – Fa – Sol', 'Garde le même doigté en déplaçant la main', 'Puis invente une variation rythmique'],
   ARRAY['La quinte est une case plus haut sur la corde aiguë voisine, l''octave deux cases plus haut deux cordes au-dessus'],
   10, '{bass}'),

  ('Alternance index-majeur', 'Une main droite régulière, la base du jeu aux doigts.', 'technique', 'beginner',
   60, 140, 10, '4/4',
   ARRAY['Corde à vide, alterne index et majeur en croches puis en doubles croches', 'Les deux doigts doivent sonner pareil', 'Change de corde sans casser l''alternance', 'Termine sur une gamme'],
   ARRAY['Laisse le doigt se reposer sur la corde grave suivante (repos)', 'Pas de saut de volume entre les doigts'],
   5, '{bass}'),

  ('Arpèges de triades et de septièmes', 'Connaître les notes des accords pour construire ses lignes.', 'arpeggios', 'intermediate',
   60, 120, 5, '4/4',
   ARRAY['Triade majeure : fondamentale, tierce, quinte, octave', 'Triade mineure, puis accords de septième (maj7, 7, m7)', 'Une mesure par accord, en noires puis en croches', 'Enchaîne sur une grille II – V – I'],
   ARRAY['Dis le nom de chaque note en la jouant', 'Garde la même forme de main en changeant de tonalité'],
   10, '{bass}'),

  ('Slap : pouce et pop', 'Le son funk : pouce sur les cordes graves, tiré sur les aiguës.', 'slap', 'intermediate',
   60, 100, 5, '4/4',
   ARRAY['Pouce sur la corde de Mi à vide, en croches, rebond rapide sur la corde', 'Index qui tire la corde de Sol (pop) sur les temps 2 et 4', 'Ajoute l''octave : pouce sur la fondamentale, pop sur l''octave', 'Ajoute des notes étouffées de la main gauche entre les deux'],
   ARRAY['Le pouce frappe vers le bas de la touche et rebondit tout de suite', 'Le pop se tire sans arracher : juste assez pour claquer'],
   10, '{bass}'),

  ('Walking bass sur un blues', 'Quatre noires par mesure qui marchent d''un accord à l''autre.', 'walking_bass', 'intermediate',
   80, 140, 5, '4/4',
   ARRAY['Grille de blues en Fa sur douze mesures', 'Fondamentale sur le temps 1 de chaque mesure', 'Remplis avec des notes de l''accord et de la gamme', 'Le temps 4 annonce l''accord suivant : un demi-ton au-dessus ou en dessous'],
   ARRAY['Pense chemin, pas gamme : chaque mesure mène à la suivante', 'Accentue légèrement 2 et 4'],
   10, '{bass}'),

  ('Ghost notes et étouffés', 'Les notes percussives qui donnent du groove à une ligne.', 'grooves', 'advanced',
   70, 110, 5, '4/4',
   ARRAY['Ligne en doubles croches : fondamentale, étouffé, étouffé, octave', 'Pose la main gauche sans appuyer pour les étouffés', 'Garde la main droite en mouvement constant', 'Déplace la ligne sur une grille de deux accords'],
   ARRAY['Les ghost notes doivent être entendues, pas jouées fort', 'Écoute Rocco Prestia ou James Jamerson pour l''intention'],
   10, '{bass}'),

  -- =========================================================
  -- Clavier / piano
  -- =========================================================
  ('Gamme de Do majeur, mains séparées puis ensemble', 'Le doigté de base sur une octave puis deux.', 'scales', 'beginner',
   60, 120, 5, '4/4',
   ARRAY['Main droite : 1-2-3, passage du pouce, 1-2-3-4-5', 'Main gauche : 5-4-3-2-1, passage du 3, 3-2-1', 'Chaque main seule, puis les deux ensemble', 'Passe à deux octaves quand c''est régulier'],
   ARRAY['Le passage du pouce se prépare avant, sans lever le coude', 'Les notes doivent toutes sonner au même volume'],
   5, '{keys}'),

  ('Gammes majeures en cycle des quintes', 'Do, Sol, Ré, La… toutes les tonalités, une par jour.', 'scales', 'intermediate',
   70, 140, 5, '4/4',
   ARRAY['Une tonalité par jour en suivant le cycle des quintes', 'Deux octaves, mains ensemble, en croches', 'Puis en doubles croches à la moitié du tempo', 'Nomme les altérations avant de commencer'],
   ARRAY['Les doigtés changent selon la tonalité : vérifie-les avant de jouer vite'],
   10, '{keys}'),

  ('Arpèges de triades', 'Les accords égrenés sur une ou deux octaves.', 'arpeggios', 'beginner',
   60, 110, 5, '4/4',
   ARRAY['Main droite : Do – Mi – Sol – Do, doigts 1-2-3-5', 'Monte et descends sur une octave, puis deux', 'Fais pareil à la main gauche (5-3-2-1)', 'Enchaîne Do, Fa, Sol, La mineur'],
   ARRAY['Le poignet accompagne le mouvement latéral, souple'],
   5, '{keys}'),

  ('Renversements d''accords', 'Passer d''un accord à l''autre sans sauter sur le clavier.', 'voicings', 'beginner',
   50, 100, 5, '4/4',
   ARRAY['Joue Do majeur à l''état fondamental, 1er puis 2e renversement', 'Enchaîne Do – Fa – Sol – Do en gardant les notes communes', 'Choisis toujours le renversement le plus proche', 'Accompagne une mélodie simple avec ces positions'],
   ARRAY['Moins la main bouge, plus l''enchaînement sonne lié'],
   10, '{keys}'),

  ('II – V – I avec voicings sans fondamentale', 'L''enchaînement de base du jazz, avec des voicings de pianiste.', 'voicings', 'intermediate',
   60, 110, 5, '4/4',
   ARRAY['Ré m7 – Sol 7 – Do maj7 : tierce et septième de chaque accord à la main gauche', 'La main droite ajoute la neuvième et la quinte', 'Une mesure par accord, puis deux accords par mesure', 'Transpose dans trois autres tonalités'],
   ARRAY['La septième d''un accord descend d''un demi-ton vers la tierce du suivant : écoute-le'],
   10, '{keys}'),

  ('Basse en octaves, accords à droite', 'Le motif d''accompagnement pop : la main gauche tient le temps.', 'independence', 'intermediate',
   60, 110, 5, '4/4',
   ARRAY['Main gauche : fondamentale en octave sur 1 et 3', 'Main droite : accord plaqué en croches', 'Grille Do – Sol – La mineur – Fa', 'Puis main droite en rythme syncopé'],
   ARRAY['Si la main gauche suit la droite, ralentis : chacune garde son rythme'],
   10, '{keys}'),

  ('Hanon n°1', 'L''exercice classique pour l''égalité et l''indépendance des doigts.', 'technique', 'beginner',
   60, 120, 4, '4/4',
   ARRAY['Joue le motif Do-Mi-Fa-Sol-La-Sol-Fa-Mi en doubles croches', 'Monte d''une note à chaque répétition sur deux octaves', 'Redescends avec le motif inversé', 'Mains ensemble, à l''octave'],
   ARRAY['Doigts arrondis, poignet stable', 'Arrête-toi dès que la main se crispe'],
   5, '{keys}'),

  ('Polyrythmie 3 contre 2', 'Une main en triolets, l''autre en croches.', 'independence', 'advanced',
   50, 90, 5, '4/4',
   ARRAY['Main gauche : deux noires par temps', 'Main droite : trois notes par temps', 'Dis « pas-sé-ra-pide » pour placer les notes', 'Inverse les mains'],
   ARRAY['Commence en tapant sur tes genoux avant le clavier'],
   10, '{keys}'),

  ('Lecture à vue quotidienne', 'Une partition nouvelle chaque jour, sans t''arrêter.', 'reading', 'beginner',
   50, 80, 5, '4/4',
   ARRAY['Choisis une pièce facile que tu n''as jamais jouée', 'Repère la tonalité, la mesure et les passages difficiles avant de jouer', 'Joue-la une fois de bout en bout, sans t''arrêter sur les erreurs', 'Recommence le lendemain avec une autre pièce'],
   ARRAY['Regarde la mesure suivante pendant que tu joues celle-ci', 'Mieux vaut une fausse note que de casser le tempo'],
   10, '{keys}'),

  -- =========================================================
  -- Pour tous les instruments
  -- =========================================================
  ('Clic sur 2 et 4', 'Le métronome ne joue que sur les contretemps : c''est toi qui portes le temps.', 'rhythm', 'beginner',
   60, 120, 5, '4/4',
   ARRAY['Règle le métronome pour qu''il ne sonne que sur les temps 2 et 4 (mode silence)', 'Joue une ligne simple ou un groove par-dessus', 'Sens le 1 et le 3 sans les entendre', 'Puis joue un morceau entier comme ça'],
   ARRAY['Claque des doigts sur le clic au début pour te caler'],
   5, '{}'),

  ('Mesures muettes', 'Le clic disparaît une mesure sur deux : tu dois retomber dessus.', 'rhythm', 'intermediate',
   60, 120, 5, '4/4',
   ARRAY['Une mesure avec le métronome, une mesure sans (mode silence)', 'Continue de jouer pendant la mesure muette', 'Vérifie que tu retombes pile sur le clic', 'Passe à deux mesures muettes sur quatre'],
   ARRAY['Si tu arrives en avance, tu accélères sans t''en rendre compte : c''est normal au début'],
   5, '{}'),

  ('Subdivisions', 'Croches, triolets, doubles croches sans changer de tempo.', 'rhythm', 'beginner',
   60, 100, 5, '4/4',
   ARRAY['Une mesure en noires, une en croches, une en triolets, une en doubles croches', 'Boucle sans t''arrêter', 'Garde exactement le même tempo de fond', 'Puis dans l''ordre inverse'],
   ARRAY['Le passage croches → triolets est le plus piégeux : compte-le à voix haute'],
   5, '{}')
) AS v(name, description, category, difficulty, starting_bpm, target_bpm, bpm_increment, time_signature, instructions, tips, duration_minutes, instruments)
WHERE NOT EXISTS (
  SELECT 1 FROM exercises e WHERE e.is_system AND e.name = v.name
);
