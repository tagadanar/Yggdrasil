(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push(["static/chunks/_f147903d._.js", {

"[project]/skills.json (json)": ((__turbopack_context__) => {

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.v(JSON.parse("{\"titre_parcours\":\"Parcours de Compétences en Ingénierie Logicielle – Approche par la Pratique\",\"philosophie\":\"Chaque compétence est acquise en réalisant des projets concrets. On commence par 'faire', puis on explore la théorie pour comprendre 'pourquoi' et 'comment' mieux faire.\",\"fundamental_skills\":[{\"id\":\"problem_solving\",\"nom\":\"Résolution de Problèmes & Algorithmique\",\"description\":\"Capacité à analyser un problème, concevoir une solution logique et efficace, et choisir les bonnes structures/algorithmes.\"},{\"id\":\"coding_implementation\",\"nom\":\"Codage & Implémentation\",\"description\":\"Maîtrise de la syntaxe, des outils (IDE, debuggers), des paradigmes de programmation et capacité à écrire du code fonctionnel et propre.\"},{\"id\":\"systems_thinking\",\"nom\":\"Pensée Systémique & Architecture\",\"description\":\"Compréhension des interactions entre les différentes couches (matériel, OS, réseau, BDD, application) et conception de systèmes cohérents.\"},{\"id\":\"collaboration_communication\",\"nom\":\"Collaboration & Communication\",\"description\":\"Aptitude à travailler en équipe, utiliser les outils collaboratifs (Git), documenter et communiquer efficacement sur des sujets techniques.\"},{\"id\":\"learning_adaptability\",\"nom\":\"Apprentissage Continu & Adaptabilité\",\"description\":\"Capacité à acquérir rapidement de nouvelles compétences techniques, à s'adapter aux changements et à mener une veille technologique.\"}],\"domaines_principaux\":[{\"id\":\"1_Creer_Premiers_Programmes\",\"titre\":\"1. Créer ses Premiers Programmes (Les Bases par l'Action)\",\"modules\":[{\"titre\":\"1.1. Automatiser des Tâches Simples (Introduction au code)\",\"actions_cles\":[\"Écrire des scripts (Shell, Python) pour manipuler des fichiers, du texte.\",\"Utiliser un terminal et les commandes de base (Navigation, gestion fichiers).\"],\"concepts_acquis\":[\"Variables\",\"Conditions\",\"Boucles\",\"Fonctions simples\",\"Entrée/sortie\"],\"skill_points\":{\"problem_solving\":2,\"coding_implementation\":3,\"systems_thinking\":1,\"collaboration_communication\":0,\"learning_adaptability\":3}},{\"titre\":\"1.2. Développer un Petit Jeu ou Utilitaire en C (Maîtrise bas niveau)\",\"actions_cles\":[\"Gérer la mémoire manuellement (malloc/free).\",\"Manipuler les pointeurs et les structures de données simples (tableaux, listes chaînées).\",\"Compiler et débugger son code.\"],\"concepts_acquis\":[\"Compilation\",\"Types de données\",\"Pointeurs\",\"Gestion mémoire\",\"Structures de contrôle\",\"Modularité basique\"],\"skill_points\":{\"problem_solving\":4,\"coding_implementation\":5,\"systems_thinking\":2,\"collaboration_communication\":1,\"learning_adaptability\":3}},{\"titre\":\"1.3. Partager et Versionner son Code (Outils collaboratifs)\",\"actions_cles\":[\"Utiliser Git pour suivre les modifications (commit, branch, merge).\",\"Collaborer sur un dépôt distant (GitHub/GitLab).\"],\"concepts_acquis\":[\"Contrôle de version décentralisé\",\"Bonnes pratiques de commit\"],\"skill_points\":{\"problem_solving\":1,\"coding_implementation\":1,\"systems_thinking\":1,\"collaboration_communication\":5,\"learning_adaptability\":2}}]},{\"id\":\"2_Construire_Applications_Web\",\"titre\":\"2. Construire des Applications Web Complètes (Du Navigateur à la Base de Données)\",\"modules\":[{\"titre\":\"2.1. Créer une Interface Web Interactive (Front-End)\",\"actions_cles\":[\"Structurer une page (HTML), la styliser (CSS).\",\"Ajouter de l'interactivité (JavaScript, DOM).\",\"Utiliser un framework front-end (React, Vue ou Angular) pour une application monopage (SPA).\",\"Appeler des APIs externes.\"],\"concepts_acquis\":[\"Modèle client-serveur\",\"HTTP\",\"Rendu navigateur\",\"Frameworks JS\",\"État applicatif front-end\"],\"skill_points\":{\"problem_solving\":2,\"coding_implementation\":4,\"systems_thinking\":1,\"collaboration_communication\":2,\"learning_adaptability\":4}},{\"titre\":\"2.2. Développer le Cerveau de l'Application (Back-End)\",\"actions_cles\":[\"Mettre en place un serveur web (Node.js/Express, Python/Django/Flask, Java/Spring Boot).\",\"Créer des APIs (RESTful, introduction à GraphQL) pour communiquer avec le front-end.\",\"Gérer l'authentification et les sessions utilisateur.\"],\"concepts_acquis\":[\"Frameworks back-end\",\"Routage\",\"Middlewares\",\"Sécurité web basique (authentification)\",\"ORM simples\"],\"skill_points\":{\"problem_solving\":4,\"coding_implementation\":4,\"systems_thinking\":3,\"collaboration_communication\":2,\"learning_adaptability\":3}},{\"titre\":\"2.3. Stocker et Récupérer des Données (Bases de Données)\",\"actions_cles\":[\"Concevoir un schéma de base de données relationnelle (SQL).\",\"Écrire des requêtes SQL (CRUD, jointures).\",\"Utiliser une base de données NoSQL (ex: MongoDB) pour des cas d'usage spécifiques.\",\"Connecter l'application back-end à la base de données.\"],\"concepts_acquis\":[\"Modélisation de données (Entité-Association, Relationnel)\",\"SGBDR vs NoSQL\",\"Transactions ACID (bases)\",\"Indexation basique\"],\"skill_points\":{\"problem_solving\":4,\"coding_implementation\":2,\"systems_thinking\":3,\"collaboration_communication\":1,\"learning_adaptability\":2}},{\"titre\":\"2.4. Assembler le Tout : Projet Full-Stack\",\"actions_cles\":[\"Intégrer Front-end, Back-end et Base de données dans un projet cohérent.\",\"Déployer une première version simple (ex: sur une VM, Heroku, Netlify).\"],\"concepts_acquis\":[\"Architecture N-tiers simple\",\"Déploiement applicatif basique\",\"Variables d'environnement\"],\"skill_points\":{\"problem_solving\":3,\"coding_implementation\":3,\"systems_thinking\":4,\"collaboration_communication\":4,\"collaboration_communication_comment\":\"assuming team project\",\"learning_adaptability\":2}}]},{\"id\":\"3_Industrialiser_Developpement\",\"titre\":\"3. Industrialiser et Fiabiliser le Développement (Passer à l'Échelle Pro)\",\"modules\":[{\"titre\":\"3.1. Écrire du Code de Qualité et le Tester\",\"actions_cles\":[\"Appliquer les principes SOLID et les Design Patterns simples en Orienté Objet (Java, C# ou C++).\",\"Écrire des tests unitaires et d'intégration (JUnit, pytest, Jest...).\",\"Mettre en place des pratiques de revue de code systématique.\",\"Utiliser des linters et formateurs de code.\"],\"concepts_acquis\":[\"POO avancée (interfaces, classes abstraites)\",\"Design Patterns (GoF basiques)\",\"TDD/BDD\",\"Qualité logicielle\",\"Dette technique\",\"Refactoring\"],\"skill_points\":{\"problem_solving\":4,\"coding_implementation\":4,\"systems_thinking\":2,\"collaboration_communication\":3,\"collaboration_communication_comment\":\"code review\",\"learning_adaptability\":3}},{\"titre\":\"3.2. Travailler Efficacement en Équipe (Méthodes Agiles)\",\"actions_cles\":[\"Participer à un projet en Scrum ou Kanban (Rituels, rôles).\",\"Gérer un backlog produit, estimer des tâches (points, idéal jours).\",\"Utiliser des outils de suivi de projet (Jira, Trello, Asana).\"],\"concepts_acquis\":[\"Manifeste Agile & Principes\",\"Flux de travail (Workflow)\",\"Collaboration et communication d'équipe\",\"Gestion de projet Agile\"],\"skill_points\":{\"problem_solving\":2,\"coding_implementation\":1,\"systems_thinking\":1,\"collaboration_communication\":5,\"learning_adaptability\":2}},{\"titre\":\"3.3. Automatiser la Chaîne de Production (CI/CD & DevOps)\",\"actions_cles\":[\"Configurer un pipeline d'intégration continue (GitLab CI, GitHub Actions, Jenkins).\",\"Automatiser les tests, le build et l'analyse statique.\",\"Mettre en place un déploiement continu simple sur un environnement de test/staging.\"],\"concepts_acquis\":[\"Automatisation (Build, Test, Deploy)\",\"Culture DevOps\",\"Infrastructure as Code (initiation)\",\"Gestion des artefacts\"],\"skill_points\":{\"problem_solving\":2,\"coding_implementation\":2,\"systems_thinking\":4,\"collaboration_communication\":3,\"learning_adaptability\":4}}]},{\"id\":\"4_Gerer_Infrastructure\",\"titre\":\"4. Gérer l'Infrastructure Sous-jacente (Faire Tourner les Applications)\",\"modules\":[{\"titre\":\"4.1. Maîtriser l'Environnement Linux\",\"actions_cles\":[\"Administrer un serveur Linux (installation, gestion des paquets, utilisateurs, permissions).\",\"Configurer des services courants (serveur web Nginx/Apache, BDD PostgreSQL/MySQL).\",\"Scripting avancé (Bash, Python) pour l'automatisation des tâches d'admin.\",\"Diagnostiquer des problèmes système (logs, monitoring basique).\"],\"concepts_acquis\":[\"Administration système Linux\",\"Principes des OS (Processus, mémoire, FS, I/O)\",\"Ligne de commande avancée\"],\"skill_points\":{\"problem_solving\":3,\"coding_implementation\":2,\"coding_implementation_comment\":\"scripting\",\"systems_thinking\":5,\"collaboration_communication\":1,\"learning_adaptability\":3}},{\"titre\":\"4.2. Comprendre et Configurer les Réseaux\",\"actions_cles\":[\"Mettre en place un petit réseau local (adressage IP, sous-réseaux, routage simple).\",\"Configurer des services réseau (DNS, DHCP).\",\"Analyser le trafic réseau (Wireshark, tcpdump).\",\"Configurer un pare-feu (iptables/ufw).\"],\"concepts_acquis\":[\"Modèle TCP/IP & OSI\",\"Protocoles réseau clés (IP, TCP, UDP, HTTP, DNS...)\",\"Sécurité réseau de base (pare-feu, NAT)\"],\"skill_points\":{\"problem_solving\":3,\"coding_implementation\":1,\"systems_thinking\":5,\"collaboration_communication\":1,\"learning_adaptability\":3}},{\"titre\":\"4.3. Virtualiser et Conteneuriser les Applications\",\"actions_cles\":[\"Utiliser des hyperviseurs (VirtualBox, VMware, KVM) pour créer des VMs.\",\"Créer des images Docker personnalisées (Dockerfile).\",\"Orchestrer une application multi-conteneurs avec Docker Compose.\",\"Gérer les volumes et les réseaux Docker.\"],\"concepts_acquis\":[\"Virtualisation vs Conteneurisation\",\"Isolation des processus\",\"Reproductibilité des environnements\",\"Microservices (introduction pratique)\"],\"skill_points\":{\"problem_solving\":2,\"coding_implementation\":2,\"coding_implementation_comment\":\"dockerfile, compose file\",\"systems_thinking\":4,\"collaboration_communication\":2,\"learning_adaptability\":4}},{\"titre\":\"4.4. Explorer le Cloud et l'Orchestration\",\"actions_cles\":[\"Utiliser les services de base d'un fournisseur cloud (AWS, Azure ou GCP : VM, S3/Blob Storage, RDS/SQL Database).\",\"Déployer une application conteneurisée sur un service managé (ECS, AKS, GKE - initiation).\",\"Déployer et gérer des applications simples avec Kubernetes (kubectl, Pods, Services, Deployments).\",\"Écrire des scripts simples pour provisionner l'infrastructure (Terraform/Ansible initiation).\"],\"concepts_acquis\":[\"Modèles IaaS/PaaS/SaaS/FaaS\",\"Avantages du Cloud (Scalabilité, élasticité, coût)\",\"Cloud Native\",\"Orchestration de conteneurs\",\"Infrastructure as Code (principes)\"],\"skill_points\":{\"problem_solving\":3,\"coding_implementation\":2,\"coding_implementation_comment\":\"iac\",\"systems_thinking\":5,\"collaboration_communication\":2,\"learning_adaptability\":5}}]},{\"id\":\"5_Securiser_Systemes\",\"titre\":\"5. Sécuriser les Systèmes (Penser Attaque et Défense)\",\"modules\":[{\"titre\":\"5.1. Trouver les Failles d'une Application Web (Pentesting Web)\",\"actions_cles\":[\"Identifier et exploiter les vulnérabilités du Top 10 OWASP (Injection SQL, XSS, CSRF...).\",\"Utiliser des outils de scan et d'exploitation (Burp Suite, OWASP ZAP, sqlmap, nmap...).\",\"Rédiger un rapport de pentest simple.\"],\"concepts_acquis\":[\"Vulnérabilités web courantes\",\"Méthodologie de pentest (reconnaissance, scan, exploitation, post-exploitation)\",\"Sécurité offensive\"],\"skill_points\":{\"problem_solving\":5,\"problem_solving_comment\":\"thinking like attacker\",\"coding_implementation\":2,\"coding_implementation_comment\":\"scripting exploits\",\"systems_thinking\":4,\"systems_thinking_comment\":\"understanding system weaknesses\",\"collaboration_communication\":2,\"collaboration_communication_comment\":\"reporting\",\"learning_adaptability\":4,\"learning_adaptability_comment\":\"new tools/vulns\"}},{\"titre\":\"5.2. Défendre son Infrastructure (Sécurité Défensive)\",\"actions_cles\":[\"Appliquer des configurations sécurisées (hardening) aux serveurs et services.\",\"Configurer et surveiller un pare-feu et un système de détection d'intrusion (IDS/IPS).\",\"Mettre en place une gestion des identités et des accès (IAM) robuste.\",\"Analyser des logs de sécurité pour détecter des anomalies.\"],\"concepts_acquis\":[\"Sécurité périmétrique et en profondeur\",\"Hardening système\",\"Monitoring de sécurité\",\"Principes du moindre privilège\"],\"skill_points\":{\"problem_solving\":3,\"coding_implementation\":1,\"systems_thinking\":5,\"collaboration_communication\":2,\"learning_adaptability\":3}},{\"titre\":\"5.3. Comprendre et Utiliser la Cryptographie (Protéger l'Information)\",\"actions_cles\":[\"Configurer HTTPS sur un serveur web (génération/installation de certificats TLS/SSL).\",\"Implémenter le hachage sécurisé des mots de passe (salage, algorithmes robustes).\",\"Chiffrer/déchiffrer des données sensibles (ex: avec GPG ou bibliothèques crypto).\",\"Utiliser SSH de manière sécurisée (clés publiques/privées).\"],\"concepts_acquis\":[\"Chiffrement symétrique vs asymétrique\",\"Fonctions de hachage cryptographique\",\"Infrastructure à Clé Publique (PKI)\",\"Protocoles sécurisés (TLS, SSH)\"],\"skill_points\":{\"problem_solving\":3,\"coding_implementation\":2,\"systems_thinking\":3,\"collaboration_communication\":1,\"learning_adaptability\":3}},{\"titre\":\"5.4. Analyser du Code Suspect (Introduction Rétro-ingénierie)\",\"actions_cles\":[\"Désassembler un programme simple (ex: crackme) avec des outils comme Ghidra ou IDA Free.\",\"Utiliser un débogueur (gdb, x64dbg) pour analyser l'exécution pas à pas.\",\"Identifier des schémas de code simples en assembleur (x86/x64).\"],\"concepts_acquis\":[\"Assembleur (bases)\",\"Analyse statique vs dynamique\",\"Décompilation/Désassemblage\",\"Analyse de malware (introduction)\"],\"skill_points\":{\"problem_solving\":4,\"coding_implementation\":3,\"coding_implementation_comment\":\"reading asm\",\"systems_thinking\":4,\"systems_thinking_comment\":\"how programs run\",\"collaboration_communication\":1,\"learning_adaptability\":4,\"learning_adaptability_comment\":\"specialized tools\"}}]},{\"id\":\"6_Exploiter_Donnees\",\"titre\":\"6. Exploiter la Puissance des Données (Analyse et IA)\",\"modules\":[{\"titre\":\"6.1. Explorer et Visualiser des Données (Data Analysis)\",\"actions_cles\":[\"Nettoyer, transformer et préparer des jeux de données (Pandas, NumPy).\",\"Réaliser des analyses statistiques descriptives pour comprendre les données.\",\"Créer des graphiques et visualisations pertinentes (Matplotlib, Seaborn).\",\"Utiliser un outil de BI (Tableau Public, Power BI Desktop) pour créer un dashboard simple.\"],\"concepts_acquis\":[\"Data Wrangling / Préparation de données\",\"Statistiques descriptives\",\"Data Visualization (principes et outils)\",\"Business Intelligence (introduction)\"],\"skill_points\":{\"problem_solving\":3,\"coding_implementation\":3,\"coding_implementation_comment\":\"pandas/numpy\",\"systems_thinking\":1,\"collaboration_communication\":2,\"collaboration_communication_comment\":\"presenting findings\",\"learning_adaptability\":3,\"learning_adaptability_comment\":\"data tools\"}},{\"titre\":\"6.2. Construire des Modèles Prédictifs Simples (Machine Learning)\",\"actions_cles\":[\"Entraîner des modèles de régression (linéaire, logistique) et de classification (Arbres de décision, SVM, KNN) avec Scikit-learn.\",\"Évaluer la performance des modèles (accuracy, precision, recall, F1-score, MSE...).\",\"Appliquer des techniques de feature engineering (sélection, encodage...).\",\"Mettre en place une validation croisée.\"],\"concepts_acquis\":[\"Apprentissage supervisé (principes)\",\"Algorithmes ML courants\",\"Métriques d'évaluation\",\"Préparation des données pour le ML\",\"Sur-apprentissage / Sous-apprentissage\"],\"skill_points\":{\"problem_solving\":4,\"problem_solving_comment\":\"model selection, feature eng.\",\"coding_implementation\":3,\"coding_implementation_comment\":\"scikit-learn API\",\"systems_thinking\":2,\"systems_thinking_comment\":\"data pipeline awareness\",\"collaboration_communication\":2,\"collaboration_communication_comment\":\"explaining model results\",\"learning_adaptability\":4,\"learning_adaptability_comment\":\"ml concepts & libraries\"}},{\"titre\":\"6.3. Mettre en Place un Pipeline de Données (Data Engineering)\",\"actions_cles\":[\"Extraire des données de différentes sources (APIs, BDD, fichiers plats).\",\"Écrire des scripts pour transformer et nettoyer les données.\",\"Charger les données dans un data warehouse simple (ex: PostgreSQL avec schéma étoile) ou un data lake (ex: stockage S3).\",\"Utiliser un outil d'orchestration simple (ex: cron + scripts, introduction à Airflow).\"],\"concepts_acquis\":[\"Processus ETL/ELT\",\"Stockage de données à grande échelle (concepts Data Warehouse / Data Lake)\",\"Pipelines de données\",\"Qualité des données (initiation)\"],\"skill_points\":{\"problem_solving\":3,\"coding_implementation\":3,\"coding_implementation_comment\":\"scripting et orchestration\",\"systems_thinking\":4,\"systems_thinking_comment\":\"data flow, storage systems\",\"collaboration_communication\":2,\"collaboration_communication_comment\":\"data engineering tools\",\"learning_adaptability\":4}},{\"titre\":\"6.4. Tester des Applications d'IA Avancées (Deep Learning & NLP/Vision)\",\"actions_cles\":[\"Utiliser des bibliothèques comme TensorFlow/Keras ou PyTorch.\",\"Charger et utiliser des modèles pré-entraînés (ex: pour classification d'images avec ResNet, analyse de sentiment avec BERT).\",\"Effectuer un fine-tuning simple d'un modèle pré-entraîné sur une tâche spécifique.\",\"Intégrer un modèle ML simple dans une application web.\"],\"concepts_acquis\":[\"Introduction aux réseaux de neurones\",\"Deep Learning (cas d'usage)\",\"Traitement du Langage Naturel (NLP) - concepts clés\",\"Vision par Ordinateur - concepts clés\",\"Transfer Learning\",\"MLOps (introduction : déploiement de modèle)\"],\"skill_points\":{\"problem_solving\":4,\"coding_implementation\":3,\"coding_implementation_comment\":\"tf/keras/pytorch API\",\"systems_thinking\":3,\"systems_thinking_comment\":\"integration, mlops\",\"collaboration_communication\":1,\"learning_adaptability\":5,\"learning_adaptability_comment\":\"rapidly evolving field\"}}]},{\"id\":\"7_Approfondir_Fondations\",\"titre\":\"7. Approfondir les Fondations (Comprendre le 'Pourquoi' pour Innover)\",\"note\":\"Ces concepts sont souvent introduits au fil de l'eau pour résoudre des problèmes spécifiques rencontrés dans les projets, ou via des modules/projets dédiés à l'optimisation ou à la compréhension profonde.\",\"modules\":[{\"titre\":\"7.1. Optimiser son Code : Algorithmique & Complexité\",\"actions_cles\":[\"Analyser la complexité temps/espace d'algorithmes existants et identifier les goulots d'étranglement.\",\"Choisir et implémenter la structure de données la plus adaptée (arbres équilibrés, graphes, tables de hachage avancées).\",\"Résoudre des problèmes algorithmiques complexes (via plateformes type CodinGame, LeetCode, projets spécifiques).\",\"Implémenter des algorithmes de graphes (parcours, plus court chemin), de programmation dynamique.\"],\"concepts_acquis\":[\"Analyse de complexité (Big O, Omega, Theta)\",\"Structures de données avancées\",\"Paradigmes algorithmiques (Diviser pour régner, Glouton, DP)\",\"Algorithmique du texte\",\"Algorithmes de graphes\"],\"skill_points\":{\"problem_solving\":5,\"coding_implementation\":4,\"systems_thinking\":1,\"collaboration_communication\":1,\"learning_adaptability\":3}},{\"titre\":\"7.2. Comprendre la Machine : Architecture & Systèmes\",\"actions_cles\":[\"Analyser l'impact du cache et de la hiérarchie mémoire sur la performance.\",\"Explorer le fonctionnement interne d'un OS (ordonnancement de processus, gestion de la mémoire virtuelle).\",\"Comprendre les étapes clés de la compilation (lexing, parsing, génération de code).\",\"Écrire du code système simple (appels système, IPC).\"],\"concepts_acquis\":[\"Architecture des processeurs (pipeline, SIMD)\",\"Hiérarchie mémoire (cache, RAM, disque)\",\"Systèmes d'exploitation avancés\",\"Compilation et interprétation\",\"Théorie des langages et automates (bases)\"],\"skill_points\":{\"problem_solving\":3,\"coding_implementation\":2,\"systems_thinking\":5,\"collaboration_communication\":1,\"learning_adaptability\":3}},{\"titre\":\"7.3. Les Maths au Service de l'Info : Logique, Graphes, Probabilités\",\"actions_cles\":[\"Modéliser des problèmes concrets avec la théorie des graphes.\",\"Utiliser la logique propositionnelle et des prédicats pour raisonner sur des systèmes.\",\"Appliquer les concepts de probabilités et statistiques pour l'analyse de données et l'évaluation de modèles ML.\",\"Comprendre les bases mathématiques de la cryptographie.\"],\"concepts_acquis\":[\"Mathématiques discrètes (Logique, Ensembles, Graphes, Combinatoire)\",\"Probabilités et Statistiques appliquées\",\"Algèbre linéaire (pour IA, graphisme)\",\"Calcul différentiel (pour optimisation, IA)\"],\"skill_points\":{\"problem_solving\":4,\"problem_solving_comment\":\"mathematical modeling\",\"coding_implementation\":1,\"systems_thinking\":2,\"collaboration_communication\":1,\"learning_adaptability\":2,\"learning_adaptability_comment\":\"abstract concepts\"}}]},{\"id\":\"8_Agir_Ingenieur_Responsable\",\"titre\":\"8. Agir en Ingénieur Responsable et Efficace (Compétences Transverses)\",\"note\":\"Ces compétences se développent tout au long du cursus, à travers tous les projets, les interactions et des modules dédiés.\",\"modules\":[{\"titre\":\"8.1. Communiquer et Vulgariser la Technique\",\"actions_cles\":[\"Rédiger une documentation technique claire et concise (README, API docs, architecture).\",\"Préparer et réaliser des présentations techniques (démos, soutenances).\",\"Participer activement aux revues de code (donner et recevoir du feedback constructif).\",\"Expliquer des concepts techniques complexes à des non-experts.\"],\"concepts_acquis\":[\"Communication écrite et orale\",\"Vulgarisation technique\",\"Documentation logicielle\",\"Feedback constructif\"],\"skill_points\":{\"problem_solving\":1,\"coding_implementation\":1,\"systems_thinking\":2,\"collaboration_communication\":5,\"learning_adaptability\":1}},{\"titre\":\"8.2. Piloter des Projets et Innover\",\"actions_cles\":[\"Estimer la charge de travail et planifier les étapes d'un projet.\",\"Identifier et gérer les risques techniques d'un projet.\",\"Contribuer à la définition de la vision produit et à la priorisation (si applicable).\",\"Mener une veille technologique active et proposer des améliorations/innovations.\"],\"concepts_acquis\":[\"Gestion de projet (bases)\",\"Gestion des risques\",\"Gestion de produit (initiation)\",\"Veille technologique\",\"Innovation et créativité\"],\"skill_points\":{\"problem_solving\":3,\"coding_implementation\":1,\"systems_thinking\":3,\"collaboration_communication\":4,\"learning_adaptability\":4,\"learning_adaptability_comment\":\"veille, innovation\"}},{\"titre\":\"8.3. Développer son Professionnalisme\",\"actions_cles\":[\"Identifier ses propres axes d'amélioration et mettre en place un plan d'apprentissage.\",\"Aborder des problèmes complexes avec méthode et persévérance.\",\"Prendre des décisions éclairées face à des contraintes (temps, ressources, technique).\",\"Respecter les engagements et les délais.\"],\"concepts_acquis\":[\"Apprentissage autonome (Learnability)\",\"Pensée critique\",\"Résolution de problèmes complexes\",\"Gestion du temps et organisation\",\"Adaptabilité et résilience\",\"Éthique professionnelle\"],\"skill_points\":{\"problem_solving\":2,\"coding_implementation\":1,\"systems_thinking\":1,\"collaboration_communication\":3,\"learning_adaptability\":5,\"learning_adaptability_comment\":\"core of professionalism\"}},{\"titre\":\"8.4. Comprendre le Contexte Économique et Légal\",\"actions_cles\":[\"Analyser le modèle économique d'une application ou d'un service.\",\"Comprendre les bases de la propriété intellectuelle (licences logicielles, brevets).\",\"Identifier les implications légales et éthiques d'un projet (ex: RGPD, biais IA).\"],\"concepts_acquis\":[\"Business Models du numérique\",\"Droit du numérique (PI, Contrats, Données personnelles)\",\"Éthique de l'IA et de la Tech\",\"Stratégie d'entreprise (bases)\"],\"skill_points\":{\"problem_solving\":2,\"coding_implementation\":0,\"systems_thinking\":2,\"collaboration_communication\":2,\"learning_adaptability\":3,\"learning_adaptability_comment\":\"understanding non-technical constraints\"}}]}]}"));}}),
"[project]/lib/skillTreeUtils.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "initializeUserProgress": (()=>initializeUserProgress),
    "transformSkillsToGraph": (()=>transformSkillsToGraph),
    "unlockSkill": (()=>unlockSkill)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$skills$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/skills.json (json)");
;
function transformSkillsToGraph(progress) {
    const nodes = [];
    const links = [];
    // First level: core skill domains
    __TURBOPACK__imported__module__$5b$project$5d2f$skills$2e$json__$28$json$29$__["default"].domaines_principaux.forEach((domain, domainIndex)=>{
        // Add domain as a node
        const domainNode = {
            id: domain.id,
            name: domain.titre.split('.')[1].trim(),
            description: domain.titre,
            isUnlocked: domainIndex === 0 || progress.unlockedSkills.includes(domain.id),
            canUnlock: canUnlockSkill(domain.id, progress),
            level: 1,
            group: domain.id,
            skillPoints: {
                problem_solving: 0,
                coding_implementation: 0,
                systems_thinking: 0,
                collaboration_communication: 0,
                learning_adaptability: 0
            }
        };
        nodes.push(domainNode);
        // Link to center node
        if (domainIndex > 0) {
            links.push({
                source: 'root',
                target: domain.id,
                value: 2
            });
        }
        // Add modules as nodes and link them to domain
        domain.modules.forEach((module, moduleIndex)=>{
            const moduleId = `${domain.id}_module_${moduleIndex}`;
            const moduleNode = {
                id: moduleId,
                name: module.titre.split('.')[2]?.trim() || module.titre,
                description: module.titre,
                isUnlocked: progress.unlockedSkills.includes(moduleId),
                canUnlock: canUnlockSkill(moduleId, progress),
                level: 2,
                group: domain.id,
                skillPoints: module.skill_points || {
                    problem_solving: 0,
                    coding_implementation: 0,
                    systems_thinking: 0,
                    collaboration_communication: 0,
                    learning_adaptability: 0
                }
            };
            nodes.push(moduleNode);
            // Link module to domain
            links.push({
                source: domain.id,
                target: moduleId,
                value: 1
            });
        });
    });
    // Add root node
    nodes.unshift({
        id: 'root',
        name: 'Compétences',
        description: __TURBOPACK__imported__module__$5b$project$5d2f$skills$2e$json__$28$json$29$__["default"].titre_parcours,
        isUnlocked: true,
        canUnlock: false,
        level: 0,
        group: 'root',
        skillPoints: {
            problem_solving: 0,
            coding_implementation: 0,
            systems_thinking: 0,
            collaboration_communication: 0,
            learning_adaptability: 0
        }
    });
    return {
        nodes,
        links
    };
}
/**
 * Determines if a skill can be unlocked based on prerequisites
 */ function canUnlockSkill(skillId, progress) {
    // Simple implementation - can unlock if:
    // 1. It's not already unlocked
    // 2. It's a direct child of an unlocked skill
    if (progress.unlockedSkills.includes(skillId)) {
        return false;
    }
    // Simple unlocking logic - can be expanded for more complex prerequisites
    if (skillId.includes('_module_')) {
        const parentId = skillId.split('_module_')[0];
        return progress.unlockedSkills.includes(parentId);
    }
    // For domains, unlock if it's the first one or if at least one skill 
    // from the previous domain is unlocked
    const domainIndex = __TURBOPACK__imported__module__$5b$project$5d2f$skills$2e$json__$28$json$29$__["default"].domaines_principaux.findIndex((d)=>d.id === skillId);
    if (domainIndex === 0) return true;
    if (domainIndex > 0) {
        const previousDomain = __TURBOPACK__imported__module__$5b$project$5d2f$skills$2e$json__$28$json$29$__["default"].domaines_principaux[domainIndex - 1];
        const previousModules = previousDomain.modules.map((_, i)=>`${previousDomain.id}_module_${i}`);
        return previousModules.some((id)=>progress.unlockedSkills.includes(id));
    }
    return false;
}
function initializeUserProgress() {
    return {
        unlockedSkills: [
            '1_Creer_Premiers_Programmes'
        ],
        skillPoints: 0
    };
}
function unlockSkill(skillId, progress) {
    if (!progress.unlockedSkills.includes(skillId) && canUnlockSkill(skillId, progress)) {
        return {
            ...progress,
            unlockedSkills: [
                ...progress.unlockedSkills,
                skillId
            ]
        };
    }
    return progress;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/app/skills/page.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>SkillsPage)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/shared/lib/app-dynamic.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$skillTreeUtils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/skillTreeUtils.ts [app-client] (ecmascript)");
;
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
// Dynamically import the SkillGraph component to avoid SSR issues with the Canvas
const SkillGraph = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(()=>__turbopack_context__.r("[project]/components/SkillTree/SkillGraph.tsx [app-client] (ecmascript, next/dynamic entry, async loader)")(__turbopack_context__.i), {
    loadableGenerated: {
        modules: [
            "[project]/components/SkillTree/SkillGraph.tsx [app-client] (ecmascript, next/dynamic entry)"
        ]
    },
    ssr: false
});
_c = SkillGraph;
function SkillsPage() {
    _s();
    const [userProgress, setUserProgress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$skillTreeUtils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initializeUserProgress"])());
    const [initialized, setInitialized] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Load saved progress from localStorage on client-side
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SkillsPage.useEffect": ()=>{
            if ("TURBOPACK compile-time truthy", 1) {
                const savedProgress = localStorage.getItem('skillTreeProgress');
                if (savedProgress) {
                    try {
                        setUserProgress(JSON.parse(savedProgress));
                    } catch (e) {
                        console.error('Failed to parse saved progress:', e);
                    }
                }
                setInitialized(true);
            }
        }
    }["SkillsPage.useEffect"], []);
    // Save progress to localStorage when it changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SkillsPage.useEffect": ()=>{
            if (initialized && "object" !== 'undefined') {
                localStorage.setItem('skillTreeProgress', JSON.stringify(userProgress));
            }
        }
    }["SkillsPage.useEffect"], [
        userProgress,
        initialized
    ]);
    // Transform skills data for visualization
    const skillGraph = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$skillTreeUtils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["transformSkillsToGraph"])(userProgress);
    // Handle progress updates
    const handleProgressUpdate = (updatedProgress)=>{
        setUserProgress(updatedProgress);
    };
    // Show loading state until client-side initialization is complete
    if (!initialized) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-center min-h-screen bg-slate-900",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "w-16 h-16 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto"
                    }, void 0, false, {
                        fileName: "[project]/app/skills/page.tsx",
                        lineNumber: 53,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-4 text-slate-300",
                        children: "Chargement de l'arbre de compétences..."
                    }, void 0, false, {
                        fileName: "[project]/app/skills/page.tsx",
                        lineNumber: 54,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/skills/page.tsx",
                lineNumber: 52,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/skills/page.tsx",
            lineNumber: 51,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-slate-900 text-slate-100",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "p-4 bg-slate-800 border-b border-slate-700",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "container mx-auto flex justify-between items-center",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "text-2xl font-bold text-teal-400",
                            children: "Arbre de Compétences"
                        }, void 0, false, {
                            fileName: "[project]/app/skills/page.tsx",
                            lineNumber: 64,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center space-x-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-slate-700 px-3 py-1 rounded-full text-sm",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            "Skills débloqués: ",
                                            userProgress.unlockedSkills.length
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/skills/page.tsx",
                                        lineNumber: 67,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/skills/page.tsx",
                                    lineNumber: 66,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setUserProgress((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$skillTreeUtils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initializeUserProgress"])()),
                                    className: "bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-full text-sm transition-colors",
                                    children: "Réinitialiser"
                                }, void 0, false, {
                                    fileName: "[project]/app/skills/page.tsx",
                                    lineNumber: 69,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/skills/page.tsx",
                            lineNumber: 65,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/skills/page.tsx",
                    lineNumber: 63,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/skills/page.tsx",
                lineNumber: 62,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "relative w-full h-[calc(100vh-64px)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SkillGraph, {
                            data: skillGraph,
                            userProgress: userProgress,
                            onProgressUpdate: handleProgressUpdate
                        }, void 0, false, {
                            fileName: "[project]/app/skills/page.tsx",
                            lineNumber: 81,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/skills/page.tsx",
                        lineNumber: 80,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute bottom-4 left-4 right-4 bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg max-w-md text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mb-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-teal-400 font-medium",
                                        children: "Double-cliquez"
                                    }, void 0, false, {
                                        fileName: "[project]/app/skills/page.tsx",
                                        lineNumber: 90,
                                        columnNumber: 13
                                    }, this),
                                    " sur un nœud disponible pour le débloquer.",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-teal-400 font-medium ml-2",
                                        children: "Glissez"
                                    }, void 0, false, {
                                        fileName: "[project]/app/skills/page.tsx",
                                        lineNumber: 91,
                                        columnNumber: 13
                                    }, this),
                                    " pour explorer l'arbre."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/skills/page.tsx",
                                lineNumber: 89,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center space-x-4 text-xs text-slate-400",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "inline-block w-3 h-3 rounded-full bg-teal-400 mr-1"
                                            }, void 0, false, {
                                                fileName: "[project]/app/skills/page.tsx",
                                                lineNumber: 95,
                                                columnNumber: 15
                                            }, this),
                                            "Débloqué"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/skills/page.tsx",
                                        lineNumber: 94,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "inline-block w-3 h-3 rounded-full bg-teal-600 mr-1"
                                            }, void 0, false, {
                                                fileName: "[project]/app/skills/page.tsx",
                                                lineNumber: 99,
                                                columnNumber: 15
                                            }, this),
                                            "Disponible"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/skills/page.tsx",
                                        lineNumber: 98,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "inline-block w-3 h-3 rounded-full bg-slate-600 mr-1"
                                            }, void 0, false, {
                                                fileName: "[project]/app/skills/page.tsx",
                                                lineNumber: 103,
                                                columnNumber: 15
                                            }, this),
                                            "Verrouillé"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/skills/page.tsx",
                                        lineNumber: 102,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/skills/page.tsx",
                                lineNumber: 93,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/skills/page.tsx",
                        lineNumber: 88,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/skills/page.tsx",
                lineNumber: 79,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/skills/page.tsx",
        lineNumber: 61,
        columnNumber: 5
    }, this);
}
_s(SkillsPage, "S7xmvTmIHSEtGOL0tiAUvwe5KII=");
_c1 = SkillsPage;
var _c, _c1;
__turbopack_context__.k.register(_c, "SkillGraph");
__turbopack_context__.k.register(_c1, "SkillsPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
/**
 * @license React
 * react-jsx-dev-runtime.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
"production" !== ("TURBOPACK compile-time value", "development") && function() {
    function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch(type){
            case REACT_FRAGMENT_TYPE:
                return "Fragment";
            case REACT_PORTAL_TYPE:
                return "Portal";
            case REACT_PROFILER_TYPE:
                return "Profiler";
            case REACT_STRICT_MODE_TYPE:
                return "StrictMode";
            case REACT_SUSPENSE_TYPE:
                return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
                return "SuspenseList";
        }
        if ("object" === typeof type) switch("number" === typeof type.tag && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof){
            case REACT_CONTEXT_TYPE:
                return (type.displayName || "Context") + ".Provider";
            case REACT_CONSUMER_TYPE:
                return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
                var innerType = type.render;
                type = type.displayName;
                type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
                return type;
            case REACT_MEMO_TYPE:
                return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
                innerType = type._payload;
                type = type._init;
                try {
                    return getComponentNameFromType(type(innerType));
                } catch (x) {}
        }
        return null;
    }
    function testStringCoercion(value) {
        return "" + value;
    }
    function checkKeyStringCoercion(value) {
        try {
            testStringCoercion(value);
            var JSCompiler_inline_result = !1;
        } catch (e) {
            JSCompiler_inline_result = !0;
        }
        if (JSCompiler_inline_result) {
            JSCompiler_inline_result = console;
            var JSCompiler_temp_const = JSCompiler_inline_result.error;
            var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
            return testStringCoercion(value);
        }
    }
    function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE) return "<...>";
        try {
            var name = getComponentNameFromType(type);
            return name ? "<" + name + ">" : "<...>";
        } catch (x) {
            return "<...>";
        }
    }
    function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
    }
    function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
            var getter = Object.getOwnPropertyDescriptor(config, "key").get;
            if (getter && getter.isReactWarning) return !1;
        }
        return void 0 !== config.key;
    }
    function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
            specialPropKeyWarningShown || (specialPropKeyWarningShown = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
        }
        warnAboutAccessingKey.isReactWarning = !0;
        Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: !0
        });
    }
    function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
    }
    function ReactElement(type, key, self, source, owner, props, debugStack, debugTask) {
        self = props.ref;
        type = {
            $$typeof: REACT_ELEMENT_TYPE,
            type: type,
            key: key,
            props: props,
            _owner: owner
        };
        null !== (void 0 !== self ? self : null) ? Object.defineProperty(type, "ref", {
            enumerable: !1,
            get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", {
            enumerable: !1,
            value: null
        });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: null
        });
        Object.defineProperty(type, "_debugStack", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
    }
    function jsxDEVImpl(type, config, maybeKey, isStaticChildren, source, self, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children) if (isStaticChildren) if (isArrayImpl(children)) {
            for(isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)validateChildKeys(children[isStaticChildren]);
            Object.freeze && Object.freeze(children);
        } else console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
        else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
            children = getComponentNameFromType(type);
            var keys = Object.keys(config).filter(function(k) {
                return "key" !== k;
            });
            isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
            didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error('A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />', isStaticChildren, children, keys, children), didWarnAboutKeySpread[children + isStaticChildren] = !0);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
            maybeKey = {};
            for(var propName in config)"key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(maybeKey, "function" === typeof type ? type.displayName || type.name || "Unknown" : type);
        return ReactElement(type, children, self, source, getOwner(), maybeKey, debugStack, debugTask);
    }
    function validateChildKeys(node) {
        "object" === typeof node && null !== node && node.$$typeof === REACT_ELEMENT_TYPE && node._store && (node._store.validated = 1);
    }
    var React = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler");
    Symbol.for("react.provider");
    var REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
    }, specialPropKeyWarningShown;
    var didWarnAboutElementRef = {};
    var didWarnAboutKeySpread = {};
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsxDEV = function(type, config, maybeKey, isStaticChildren, source, self) {
        return jsxDEVImpl(type, config, maybeKey, isStaticChildren, source, self, Error("react-stack-top-frame"), createTask(getTaskName(type)));
    };
}();
}}),
"[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use strict';
if ("TURBOPACK compile-time falsy", 0) {
    "TURBOPACK unreachable";
} else {
    module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)");
}
}}),
"[project]/node_modules/next/dist/shared/lib/lazy-dynamic/dynamic-bailout-to-csr.js [app-client] (ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BailoutToCSR", {
    enumerable: true,
    get: function() {
        return BailoutToCSR;
    }
});
const _bailouttocsr = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/lazy-dynamic/bailout-to-csr.js [app-client] (ecmascript)");
function BailoutToCSR(param) {
    let { reason, children } = param;
    if (typeof window === 'undefined') {
        throw Object.defineProperty(new _bailouttocsr.BailoutToCSRError(reason), "__NEXT_ERROR_CODE", {
            value: "E394",
            enumerable: false,
            configurable: true
        });
    }
    return children;
} //# sourceMappingURL=dynamic-bailout-to-csr.js.map
}}),
"[project]/node_modules/next/dist/shared/lib/encode-uri-path.js [app-client] (ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "encodeURIPath", {
    enumerable: true,
    get: function() {
        return encodeURIPath;
    }
});
function encodeURIPath(file) {
    return file.split('/').map((p)=>encodeURIComponent(p)).join('/');
} //# sourceMappingURL=encode-uri-path.js.map
}}),
"[project]/node_modules/next/dist/shared/lib/lazy-dynamic/preload-chunks.js [app-client] (ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PreloadChunks", {
    enumerable: true,
    get: function() {
        return PreloadChunks;
    }
});
const _jsxruntime = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
const _reactdom = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react-dom/index.js [app-client] (ecmascript)");
const _workasyncstorageexternal = __turbopack_context__.r("[project]/node_modules/next/dist/server/app-render/work-async-storage.external.js [app-client] (ecmascript)");
const _encodeuripath = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/encode-uri-path.js [app-client] (ecmascript)");
function PreloadChunks(param) {
    let { moduleIds } = param;
    // Early return in client compilation and only load requestStore on server side
    if (typeof window !== 'undefined') {
        return null;
    }
    const workStore = _workasyncstorageexternal.workAsyncStorage.getStore();
    if (workStore === undefined) {
        return null;
    }
    const allFiles = [];
    // Search the current dynamic call unique key id in react loadable manifest,
    // and find the corresponding CSS files to preload
    if (workStore.reactLoadableManifest && moduleIds) {
        const manifest = workStore.reactLoadableManifest;
        for (const key of moduleIds){
            if (!manifest[key]) continue;
            const chunks = manifest[key].files;
            allFiles.push(...chunks);
        }
    }
    if (allFiles.length === 0) {
        return null;
    }
    const dplId = ("TURBOPACK compile-time falsy", 0) ? ("TURBOPACK unreachable", undefined) : '';
    return /*#__PURE__*/ (0, _jsxruntime.jsx)(_jsxruntime.Fragment, {
        children: allFiles.map((chunk)=>{
            const href = workStore.assetPrefix + "/_next/" + (0, _encodeuripath.encodeURIPath)(chunk) + dplId;
            const isCss = chunk.endsWith('.css');
            // If it's stylesheet we use `precedence` o help hoist with React Float.
            // For stylesheets we actually need to render the CSS because nothing else is going to do it so it needs to be part of the component tree.
            // The `preload` for stylesheet is not optional.
            if (isCss) {
                return /*#__PURE__*/ (0, _jsxruntime.jsx)("link", {
                    // @ts-ignore
                    precedence: "dynamic",
                    href: href,
                    rel: "stylesheet",
                    as: "style"
                }, chunk);
            } else {
                // If it's script we use ReactDOM.preload to preload the resources
                (0, _reactdom.preload)(href, {
                    as: 'script',
                    fetchPriority: 'low'
                });
                return null;
            }
        })
    });
} //# sourceMappingURL=preload-chunks.js.map
}}),
"[project]/node_modules/next/dist/shared/lib/lazy-dynamic/loadable.js [app-client] (ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
const _jsxruntime = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
const _react = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
const _dynamicbailouttocsr = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/lazy-dynamic/dynamic-bailout-to-csr.js [app-client] (ecmascript)");
const _preloadchunks = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/lazy-dynamic/preload-chunks.js [app-client] (ecmascript)");
// Normalize loader to return the module as form { default: Component } for `React.lazy`.
// Also for backward compatible since next/dynamic allows to resolve a component directly with loader
// Client component reference proxy need to be converted to a module.
function convertModule(mod) {
    // Check "default" prop before accessing it, as it could be client reference proxy that could break it reference.
    // Cases:
    // mod: { default: Component }
    // mod: Component
    // mod: { default: proxy(Component) }
    // mod: proxy(Component)
    const hasDefault = mod && 'default' in mod;
    return {
        default: hasDefault ? mod.default : mod
    };
}
const defaultOptions = {
    loader: ()=>Promise.resolve(convertModule(()=>null)),
    loading: null,
    ssr: true
};
function Loadable(options) {
    const opts = {
        ...defaultOptions,
        ...options
    };
    const Lazy = /*#__PURE__*/ (0, _react.lazy)(()=>opts.loader().then(convertModule));
    const Loading = opts.loading;
    function LoadableComponent(props) {
        const fallbackElement = Loading ? /*#__PURE__*/ (0, _jsxruntime.jsx)(Loading, {
            isLoading: true,
            pastDelay: true,
            error: null
        }) : null;
        // If it's non-SSR or provided a loading component, wrap it in a suspense boundary
        const hasSuspenseBoundary = !opts.ssr || !!opts.loading;
        const Wrap = hasSuspenseBoundary ? _react.Suspense : _react.Fragment;
        const wrapProps = hasSuspenseBoundary ? {
            fallback: fallbackElement
        } : {};
        const children = opts.ssr ? /*#__PURE__*/ (0, _jsxruntime.jsxs)(_jsxruntime.Fragment, {
            children: [
                typeof window === 'undefined' ? /*#__PURE__*/ (0, _jsxruntime.jsx)(_preloadchunks.PreloadChunks, {
                    moduleIds: opts.modules
                }) : null,
                /*#__PURE__*/ (0, _jsxruntime.jsx)(Lazy, {
                    ...props
                })
            ]
        }) : /*#__PURE__*/ (0, _jsxruntime.jsx)(_dynamicbailouttocsr.BailoutToCSR, {
            reason: "next/dynamic",
            children: /*#__PURE__*/ (0, _jsxruntime.jsx)(Lazy, {
                ...props
            })
        });
        return /*#__PURE__*/ (0, _jsxruntime.jsx)(Wrap, {
            ...wrapProps,
            children: children
        });
    }
    LoadableComponent.displayName = 'LoadableComponent';
    return LoadableComponent;
}
const _default = Loadable; //# sourceMappingURL=loadable.js.map
}}),
"[project]/node_modules/next/dist/shared/lib/app-dynamic.js [app-client] (ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return dynamic;
    }
});
const _interop_require_default = __turbopack_context__.r("[project]/node_modules/@swc/helpers/cjs/_interop_require_default.cjs [app-client] (ecmascript)");
const _loadable = /*#__PURE__*/ _interop_require_default._(__turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/lazy-dynamic/loadable.js [app-client] (ecmascript)"));
function dynamic(dynamicOptions, options) {
    var _mergedOptions_loadableGenerated;
    const loadableOptions = {};
    if (typeof dynamicOptions === 'function') {
        loadableOptions.loader = dynamicOptions;
    }
    const mergedOptions = {
        ...loadableOptions,
        ...options
    };
    return (0, _loadable.default)({
        ...mergedOptions,
        modules: (_mergedOptions_loadableGenerated = mergedOptions.loadableGenerated) == null ? void 0 : _mergedOptions_loadableGenerated.modules
    });
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=app-dynamic.js.map
}}),
}]);

//# sourceMappingURL=_f147903d._.js.map