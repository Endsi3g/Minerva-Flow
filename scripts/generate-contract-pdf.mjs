import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Entente de Projet Pilote — Minerva Flow</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: letter;
      margin: 18mm 18mm 18mm 18mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1A1E16;
      background-color: #FFFFFF;
      font-size: 9pt;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    .page {
      page-break-after: always;
      break-after: page;
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 860px;
    }

    .page:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }

    .page-content {
      flex: 1;
    }

    /* RUNNING FOOTER */
    .page-footer {
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px solid #EEE9DB;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #8D9488;
    }

    .page-footer .left {
      font-weight: 500;
    }

    .page-footer .right {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
    }

    /* HEADER */
    .header {
      border-bottom: 2px solid #167F5B;
      padding-bottom: 10px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .brand-group {
      display: flex;
      flex-direction: column;
    }

    .brand-logo {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 20pt;
      font-weight: 700;
      color: #0E5A40;
      letter-spacing: -0.4px;
      line-height: 1.1;
    }

    .brand-tagline {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 1.4px;
      color: #167F5B;
      font-weight: 600;
      margin-top: 2px;
    }

    .doc-meta {
      text-align: right;
      font-size: 8.2pt;
      color: #565F52;
    }

    .doc-meta .doc-badge {
      display: inline-block;
      background: #EEF5F0;
      color: #0E5A40;
      border: 1px solid #DCECE3;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 3px;
    }

    /* TITLE */
    .doc-title-box {
      background: #FAF8F3;
      border: 1px solid #E6E0D0;
      border-left: 4px solid #167F5B;
      padding: 11px 15px;
      margin-bottom: 14px;
      border-radius: 0 5px 5px 0;
    }

    .doc-title-box h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 14pt;
      font-weight: 700;
      color: #1A1E16;
      margin-bottom: 2px;
      letter-spacing: -0.2px;
    }

    .doc-title-box p {
      font-size: 8.2pt;
      color: #565F52;
    }

    /* PARTIES */
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }

    .party-card {
      background: #FAFAFA;
      border: 1px solid #EEE9DB;
      border-radius: 5px;
      padding: 10px 14px;
    }

    .party-role {
      font-size: 7.8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #167F5B;
      margin-bottom: 3px;
    }

    .party-name {
      font-weight: 700;
      font-size: 10pt;
      color: #1A1E16;
    }

    .party-details {
      font-size: 8.3pt;
      color: #565F52;
      margin-top: 2px;
      line-height: 1.38;
    }

    .effective-date {
      font-size: 8.6pt;
      background: #F5F1E6;
      border: 1px solid #E6E0D0;
      border-radius: 4px;
      padding: 6px 12px;
      margin-bottom: 16px;
      color: #1A1E16;
      font-weight: 500;
    }

    .effective-date strong {
      color: #0E5A40;
    }

    /* ARTICLES */
    .article {
      margin-bottom: 12px;
    }

    .article-header {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 10.2pt;
      font-weight: 700;
      color: #0E5A40;
      border-bottom: 1px solid #EEE9DB;
      padding-bottom: 3px;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .article-header .num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9pt;
      color: #167F5B;
      font-weight: 600;
    }

    .article p {
      margin-bottom: 5px;
      text-align: justify;
      font-size: 8.8pt;
    }

    .sub-item {
      margin-left: 8px;
      margin-bottom: 4px;
      text-align: justify;
      font-size: 8.7pt;
    }

    .sub-item strong {
      color: #1A1E16;
    }

    .highlight-box {
      background: #EEF5F0;
      border: 1px solid #DCECE3;
      border-left: 3px solid #167F5B;
      padding: 8px 12px;
      border-radius: 0 4px 4px 0;
      margin: 8px 0;
      font-size: 8.7pt;
      text-align: justify;
    }

    /* SIGNATURES */
    .signatures-section {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1.5px solid #E6E0D0;
    }

    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 12px;
    }

    .signature-card {
      border: 1px solid #DDD8CA;
      border-radius: 6px;
      background: #FCFBF9;
      padding: 12px 14px;
    }

    .signature-card-title {
      font-size: 8.2pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #167F5B;
      margin-bottom: 8px;
    }

    .sign-line {
      margin-top: 36px;
      border-top: 1px dashed #A2A99E;
      padding-top: 4px;
      font-size: 7.8pt;
      color: #565F52;
    }

    .sign-meta-row {
      display: flex;
      justify-content: space-between;
      margin-top: 5px;
      font-size: 8.2pt;
    }

    .sign-meta-label {
      color: #565F52;
      font-weight: 500;
    }

    .sign-meta-val {
      color: #1A1E16;
      font-weight: 600;
    }

    /* ANNEXE A */
    .annexe-header {
      background: #FAF8F3;
      border: 1px solid #E6E0D0;
      border-left: 4px solid #167F5B;
      padding: 12px 16px;
      margin-bottom: 16px;
      border-radius: 0 5px 5px 0;
    }

    .annexe-header h2 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 13pt;
      font-weight: 700;
      color: #1A1E16;
      margin-bottom: 2px;
    }

    .annexe-header p {
      font-size: 8.4pt;
      color: #565F52;
    }

    .checklist {
      list-style: none;
      margin: 16px 0;
    }

    .checklist-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 9px 10px;
      border-bottom: 1px solid #EEE9DB;
      font-size: 8.8pt;
    }

    .checklist-box {
      width: 15px;
      height: 15px;
      border: 1.5px solid #167F5B;
      border-radius: 3px;
      margin-top: 2px;
      flex-shrink: 0;
      background: #FFF;
    }

    .custom-criteria-box {
      margin-top: 20px;
      background: #FAFAFA;
      border: 1px dashed #DDD8CA;
      border-radius: 6px;
      padding: 12px 16px;
    }

    .write-in-line {
      border-bottom: 1px solid #DDD8CA;
      height: 24px;
      margin-top: 10px;
    }

    .legal-disclaimer {
      margin-top: 24px;
      font-size: 8pt;
      color: #8D9488;
      font-style: italic;
      text-align: center;
      border-top: 1px solid #EEE9DB;
      padding-top: 10px;
      line-height: 1.45;
    }
  </style>
</head>
<body>

  <!-- ==================== PAGE 1 : CADRE & IMPLÉMENTATION ==================== -->
  <div class="page">
    <div class="page-content">
      <div class="header">
        <div class="brand-group">
          <div class="brand-logo">Minerva Flow</div>
          <div class="brand-tagline">Système Opérationnel & Pilotage Restauration</div>
        </div>
        <div class="doc-meta">
          <div class="doc-badge">Projet Pilote</div>
          <div>Document contractuel d'exploitation</div>
        </div>
      </div>

      <div class="doc-title-box">
        <h1>ENTENTE DE PROJET PILOTE</h1>
        <p>Cadre d'implémentation opérationnelle, période d'essai gratuite et passage à l'abonnement régulier</p>
      </div>

      <div class="parties-grid">
        <div class="party-card">
          <div class="party-role">Prestataire</div>
          <div class="party-name">Kael Belceus</div>
          <div class="party-details">
            Faisant affaire sous le nom <strong>Minerva</strong><br>
            Entrepreneur individuel / Travailleur autonome<br>
            367 rue Laberge, Repentigny (Québec) J6A 4C2<br>
            <em>(ci-après le « Prestataire »)</em>
          </div>
        </div>

        <div class="party-card">
          <div class="party-role">Client</div>
          <div class="party-name">Marie-Vane Milien</div>
          <div class="party-details">
            Faisant affaire sous le nom <strong>Mains Magiques ADM</strong><br>
            Entrepreneur individuel / Travailleur autonome<br>
            295 Boulevard d'Iberville, Repentigny (Québec) J6A 2A4<br>
            <em>(ci-après le « Client »)</em>
          </div>
        </div>
      </div>

      <div class="effective-date">
        Date d'entrée en vigueur : <strong>15 septembre 2026</strong> · Les Parties sont collectivement désignées les « Parties ».
      </div>

      <div class="article">
        <div class="article-header"><span class="num">1.</span> Objet de l'entente</div>
        <p>Le Prestataire s'engage à implémenter et à fournir au Client un accès à la plateforme logicielle <strong>Minerva Flow</strong> (le « Logiciel »), un outil de gestion opérationnelle destiné aux restaurants et cafés couvrant notamment le suivi des revenus, la gestion de l'inventaire, le suivi des journées de service et l'aide à la décision opérationnelle, selon les modalités décrites ci-dessous.</p>
      </div>

      <div class="article">
        <div class="article-header"><span class="num">2.</span> Statut légal du Prestataire</div>
        <p>Le Client reconnaît et accepte que Minerva n'est pas, à la Date d'entrée en vigueur, une personne morale incorporée. Minerva est exploitée sous forme d'entreprise individuelle par Kael Belceus, lequel est actuellement en démarche d'incorporation. Toute référence à « Minerva » dans la présente entente désigne Kael Belceus faisant affaire sous ce nom. Advenant la complétion de l'incorporation, la présente entente sera automatiquement cédée à la nouvelle entité incorporée, sans que cela n'affecte les droits et obligations respectifs des Parties. Le Client sera avisé par écrit de cette cession le cas échéant.</p>
      </div>

      <div class="article">
        <div class="article-header"><span class="num">3.</span> Phase d'implémentation</div>
        <div class="sub-item"><strong>3.1 Délai maximal.</strong> Le Prestataire s'engage à compléter l'implémentation fonctionnelle du Logiciel dans un délai maximal de deux (2) semaines calendaires suivant la Date d'entrée en vigueur.</div>
        <div class="sub-item"><strong>3.2 Mise en service anticipée.</strong> Si l'ensemble des critères de fonctionnalité décrits à l'Annexe A sont atteints en moins d'une (1) semaine, le Client pourra commencer à utiliser le Logiciel en production dès cette date, sans attendre l'écoulement du délai de deux semaines.</div>
        <div class="sub-item"><strong>3.3 Date de mise en service.</strong> La date à laquelle le Client commence effectivement à utiliser le Logiciel en conditions réelles (anticipée ou non) constitue le point de départ de la période d'essai gratuite décrite à l'article 4.</div>
      </div>
    </div>

    <div class="page-footer">
      <span class="left">Minerva Technologies Inc. · Confidentiel · Entente de Projet Pilote</span>
      <span class="right">Page 1 sur 4</span>
    </div>
  </div>

  <!-- ==================== PAGE 2 : MODALITÉS D'ESSAI & TARIFICATION ==================== -->
  <div class="page">
    <div class="page-content">
      <div class="header">
        <div class="brand-group">
          <div class="brand-logo" style="font-size: 15pt;">Minerva Flow</div>
        </div>
        <div class="doc-meta">
          <div>Entente de Projet Pilote · Modalités d'essai & Tarification</div>
        </div>
      </div>

      <div class="article">
        <div class="article-header"><span class="num">4.</span> Période d'essai gratuite</div>
        <div class="sub-item"><strong>4.1 Durée initiale.</strong> Le Client bénéficie d'une période d'essai gratuite d'un (1) mois civil, débutant à la date de mise en service décrite à l'article 3.3.</div>
        <div class="sub-item"><strong>4.2 Extension conditionnelle.</strong> Si, à la fin du mois d'essai, le Client juge de bonne foi que le Logiciel ne répond pas de façon satisfaisante aux critères de l'Annexe A, le Prestataire accepte de prolonger gratuitement l'accès pour une période additionnelle maximale de trente (30) jours calendaires, afin de corriger les lacunes identifiées.</div>
        <div class="sub-item"><strong>4.3 Plafond absolu.</strong> En aucun cas la période gratuite totale (essai initial et extension combinés) ne peut excéder soixante (60) jours calendaires à compter de la date de mise en service. Au terme de cette période, le Client s'engage soit à passer à l'abonnement payant selon les modalités convenues à l'article 5, soit à mettre fin à l'entente conformément à l'article 7.</div>
        <div class="sub-item"><strong>4.4 Procédure de demande.</strong> Toute demande d'extension doit être transmise par écrit (courriel accepté) au moins cinq (5) jours avant la fin de la période en cours, accompagnée d'une description précise des lacunes constatées au regard des critères de l'Annexe A.</div>
      </div>

      <div class="article">
        <div class="article-header"><span class="num">5.</span> Passage à l'abonnement payant et fixation du tarif</div>
        <div class="sub-item"><strong>5.1 Détermination du tarif à l'issue de l'essai.</strong> À l'issue de la période d'essai gratuite décrite à l'article 4 (ou de son extension éventuelle le cas échéant), le tarif de l'abonnement mensuel régulier au Logiciel sera déterminé d'un commun accord par écrit entre les Parties, en tenant compte de l'usage réel, des fonctionnalités retenues et des besoins opérationnels constatés durant la période pilote. Au moins sept (7) jours ouvrables avant l'expiration de la période d'essai gratuite, le Prestataire transmettra au Client une proposition tarifaire écrite pour l'abonnement mensuel.</div>
        
        <div class="highlight-box">
          <strong>5.2 Accord mutuel et clause de sortie sans frais.</strong> Si les Parties s'entendent par écrit sur le tarif mensuel proposé ou négocié avant l'échéance de la période d'essai, ce tarif s'appliquera pour la suite de l'abonnement, taxes applicables en sus. À défaut d'entente mutuelle écrite sur le tarif avant la fin de la période d'essai gratuite, la présente entente prendra fin automatiquement à la date d'échéance de l'essai, sans pénalité, sans frais additionnels et sans obligation financière pour le Client. L'accès au Logiciel sera alors désactivé, le Client conservant le droit d'exporter ses données opérationnelles conformément à l'article 8.
        </div>
        
        <div class="sub-item"><strong>5.3 Rabais pour témoignage sur le premier mois payant.</strong> Si le Client fournit au Prestataire, avant ou au moment du premier paiement, un témoignage sous forme (a) d'une vidéo, (b) d'un texte écrit, ou (c) d'une combinaison des deux, portant sur son expérience avec le Logiciel, le Prestataire accorde un rabais de vingt-cinq pour cent (25 %) applicable uniquement à ce premier mois payant, calculé sur le tarif mensuel convenu en vertu de l'article 5.1. Ce rabais ne s'applique à aucun mois subséquent.</div>
        <div class="sub-item"><strong>5.4 Facturation subséquente.</strong> À compter du deuxième mois payant, le plein tarif mensuel convenu en vertu de l'article 5.1 s'applique de mois en mois, sauf entente écrite contraire entre les Parties.</div>
      </div>

      <div class="article">
        <div class="article-header"><span class="num">6.</span> Renouvellement</div>
        <p>L'abonnement payant se renouvelle automatiquement de mois en mois à compter du premier mois payant au tarif convenu en vertu de l'article 5, sauf avis de résiliation transmis par écrit par l'une ou l'autre des Parties avec un préavis d'au moins quinze (15) jours avant la date de renouvellement mensuelle.</p>
      </div>
    </div>

    <div class="page-footer">
      <span class="left">Minerva Technologies Inc. · Confidentiel · Entente de Projet Pilote</span>
      <span class="right">Page 2 sur 4</span>
    </div>
  </div>

  <!-- ==================== PAGE 3 : CADRE LÉGAL & SIGNATURES ==================== -->
  <div class="page">
    <div class="page-content">
      <div class="header">
        <div class="brand-group">
          <div class="brand-logo" style="font-size: 15pt;">Minerva Flow</div>
        </div>
        <div class="doc-meta">
          <div>Entente de Projet Pilote · Cadre légal & Signatures</div>
        </div>
      </div>

      <div class="article">
        <div class="article-header"><span class="num">7.</span> Résiliation</div>
        <p>Chacune des Parties peut mettre fin à la présente entente en tout temps, moyennant un préavis écrit de quinze (15) jours. En cas de résiliation durant la période gratuite ou en l'absence d'entente tarifaire au terme de celle-ci, aucune somme n'est due par le Client. En cas de résiliation durant une période payante, le Client demeure redevable des sommes dues jusqu'à la date effective de résiliation, sans remboursement au prorata sauf entente contraire.</p>
      </div>

      <div class="article">
        <div class="article-header"><span class="num">8.</span> Propriété intellectuelle et données</div>
        <p>Le Logiciel Minerva Flow, son code source, son architecture et sa marque demeurent en tout temps la propriété exclusive du Prestataire. Le Client se voit accorder un droit d'usage non exclusif et non transférable, limité à la durée de la présente entente. Les données opérationnelles saisies par le Client dans le Logiciel (données de vente, d'inventaire, etc.) demeurent la propriété du Client, qui pourra en obtenir une exportation sur demande raisonnable en cas de résiliation.</p>
      </div>

      <div class="article">
        <div class="article-header"><span class="num">9.</span> Confidentialité</div>
        <p>Chaque Partie s'engage à garder confidentielles les informations commerciales, financières et opérationnelles de l'autre Partie dont elle prend connaissance dans le cadre de la présente entente, et à ne pas les divulguer à des tiers sans consentement écrit préalable, sauf obligation légale contraire.</p>
      </div>

      <div class="article">
        <div class="article-header"><span class="num">10.</span> Limitation de responsabilité</div>
        <p>Le Logiciel est fourni « tel quel » durant la phase pilote décrite aux articles 3 et 4. Le Prestataire ne garantit pas l'absence totale d'interruption de service et ne pourra être tenu responsable des dommages indirects, pertes de profits ou pertes de données découlant de l'utilisation du Logiciel. La responsabilité totale du Prestataire envers le Client, le cas échéant, est limitée aux sommes effectivement versées par le Client au cours des trois (3) derniers mois précédant la réclamation.</p>
      </div>

      <div class="article">
        <div class="article-header"><span class="num">11.</span> Droit applicable</div>
        <p>La présente entente est régie par les lois de la province de Québec et les lois fédérales du Canada qui y sont applicables. Tout litige sera soumis aux tribunaux compétents du district judiciaire de Montréal.</p>
      </div>

      <!-- SIGNATURES -->
      <div class="signatures-section">
        <div class="article-header"><span class="num">12.</span> Signatures des Parties</div>
        <p style="font-size: 8.5pt; margin-bottom: 8px;">Les Parties reconnaissent avoir lu et compris la présente entente et l'acceptent en y apposant leur signature ci-dessous.</p>

        <div class="signatures-grid">
          <div class="signature-card">
            <div class="signature-card-title">Pour Minerva (Prestataire)</div>
            <div class="sign-meta-row">
              <span class="sign-meta-label">Nom du signataire :</span>
              <span class="sign-meta-val">Kael Belceus</span>
            </div>
            <div class="sign-meta-row">
              <span class="sign-meta-label">Titre :</span>
              <span class="sign-meta-val">Fondateur / Prestataire</span>
            </div>
            <div class="sign-line">Signature du Prestataire</div>
            <div class="sign-meta-row" style="margin-top: 10px;">
              <span class="sign-meta-label">Date :</span>
              <span class="sign-meta-val">____________________</span>
            </div>
          </div>

          <div class="signature-card">
            <div class="signature-card-title">Pour Mains Magiques ADM (Client)</div>
            <div class="sign-meta-row">
              <span class="sign-meta-label">Nom du signataire :</span>
              <span class="sign-meta-val">Marie-Vane Milien</span>
            </div>
            <div class="sign-meta-row">
              <span class="sign-meta-label">Titre :</span>
              <span class="sign-meta-val">Propriétaire / Exploitante</span>
            </div>
            <div class="sign-line">Signature du Client</div>
            <div class="sign-meta-row" style="margin-top: 10px;">
              <span class="sign-meta-label">Date :</span>
              <span class="sign-meta-val">____________________</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span class="left">Minerva Technologies Inc. · Confidentiel · Entente de Projet Pilote</span>
      <span class="right">Page 3 sur 4</span>
    </div>
  </div>

  <!-- ==================== PAGE 4 : ANNEXE A ==================== -->
  <div class="page">
    <div class="page-content">
      <div class="header">
        <div class="brand-group">
          <div class="brand-logo" style="font-size: 15pt;">Minerva Flow</div>
        </div>
        <div class="doc-meta">
          <div>Entente de Projet Pilote · Annexe A</div>
        </div>
      </div>

      <div class="annexe-header">
        <h2>Annexe A — Critères de fonctionnalité minimale</h2>
        <p>Base d'évaluation d'achèvement de mise en service (art. 3.2) et d'extension d'essai (art. 4.2)</p>
      </div>

      <p style="margin-bottom: 14px; font-size: 8.8pt; text-align: justify;">
        Les critères suivants déterminent (a) le moment où le Logiciel est considéré comme fonctionnel aux fins de l'article 3.2, et (b) la base d'évaluation pour toute demande d'extension aux termes de l'article 4.2. Cette liste est personnalisée selon la portée réelle convenue avec le Client avant signature :
      </p>

      <ul class="checklist">
        <li class="checklist-item">
          <div class="checklist-box"></div>
          <div><strong>Module de suivi des revenus :</strong> Opérationnel et connecté aux flux de données réelles du Client.</div>
        </li>
        <li class="checklist-item">
          <div class="checklist-box"></div>
          <div><strong>Module d'inventaire :</strong> Configuré avec les items et fiches d'ingrédients réels du Client.</div>
        </li>
        <li class="checklist-item">
          <div class="checklist-box"></div>
          <div><strong>Suivi des journées de service :</strong> Actif, documenté et utilisé en conditions réelles d'exploitation.</div>
        </li>
        <li class="checklist-item">
          <div class="checklist-box"></div>
          <div><strong>Autonomie opérationnelle :</strong> Le Client a complété l'onboarding et peut générer un rapport de base de façon autonome.</div>
        </li>
        <li class="checklist-item">
          <div class="checklist-box"></div>
          <div><strong>Stabilité logicielle :</strong> Aucun bug bloquant non résolu signalé lors des tests conjoints en production.</div>
        </li>
      </ul>

      <div class="custom-criteria-box">
        <strong style="font-size: 8.4pt; text-transform: uppercase; letter-spacing: 0.5px; color: #565F52;">Autres critères spécifiques convenus entre les Parties :</strong>
        <div class="write-in-line"></div>
        <div class="write-in-line"></div>
        <div class="write-in-line"></div>
      </div>

      <div class="legal-disclaimer">
        Ce document est un gabarit contractuel préparé à titre indicatif et ne constitue pas un avis juridique formel.<br>
        Une validation par un professionnel du droit est recommandée avant signature, notamment en raison du statut d'entreprise individuelle en cours d'incorporation.
      </div>
    </div>

    <div class="page-footer">
      <span class="left">Minerva Technologies Inc. · Confidentiel · Entente de Projet Pilote</span>
      <span class="right">Page 4 sur 4</span>
    </div>
  </div>

</body>
</html>
`;

async function main() {
  const outputDirDocs = path.join(process.cwd(), 'docs', 'contrats');
  const artifactDir = '/Users/kaelbelceus/.gemini/antigravity-ide/brain/118695f2-fcd7-4d79-982e-d104b7c395da';

  if (!fs.existsSync(outputDirDocs)) {
    fs.mkdirSync(outputDirDocs, { recursive: true });
  }

  const pdfPathDocs = path.join(outputDirDocs, 'ENTENTE_PROJET_PILOTE_MINERVA_FLOW.pdf');
  const pdfPathArtifact = path.join(artifactDir, 'ENTENTE_PROJET_PILOTE_MINERVA_FLOW.pdf');

  console.log('Lancement de Chromium via Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Chargement du template HTML...');
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  console.log('Génération du PDF haute fidélité (4 pages thématiques équilibrées)...');
  const pdfBuffer = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: {
      top: '0mm',
      bottom: '0mm',
      left: '0mm',
      right: '0mm'
    },
    displayHeaderFooter: false
  });

  await browser.close();

  fs.writeFileSync(pdfPathDocs, pdfBuffer);
  console.log('PDF sauvegardé dans docs :', pdfPathDocs);

  if (fs.existsSync(artifactDir)) {
    fs.writeFileSync(pdfPathArtifact, pdfBuffer);
    console.log('PDF copié dans les artefacts :', pdfPathArtifact);
  }

  console.log('Génération terminée avec succès !');
}

main().catch(err => {
  console.error('Erreur de génération PDF :', err);
  process.exit(1);
});
