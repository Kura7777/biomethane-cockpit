import { BiomethanePlant, ContactConfidence, PlantContactQuality } from './types';
import { getOfficialRegisterForCountry } from './officialRegisters';

/**
 * Plant Contact Quality & Outreach Risk Engine.
 *
 * Institutional reality check:
 * - 434 European plants (22%) have email domains that do not exist on the public internet,
 *   derived synthetically from plant location names (e.g. contact@fontaine-le-dun.fr).
 * - ~990 plants share email addresses and ~920 share phone numbers (e.g. EnviTec switchboard
 *   +49 4442 80160 on 86 plants; utility call centers; DSO meter hotlines).
 * - ~378 plants list contact emails belonging to a third-party company or competitor.
 * - Private farmers' personal mailboxes (Gmail, Skynet, etc.) trigger strict EU GDPR
 *   and national PECR cold-marketing compliance restrictions.
 *
 * ZERO plant contacts in the raw registry are verified. Every entry is categorized as:
 *  1. UNDELIVERABLE: dead domain, non-resolving synthetic address, or truncated mailbox.
 *  2. INDIRECT: shared corporate switchboard (5+ facilities), DSO customer line, or operator mismatch.
 *  3. UNVERIFIED_LEAD: syntax passes basic structure checks, but active deliverability and commercial
 *     authority require manual desk verification.
 *  4. NO_CONTACT: no email or phone published.
 *
 * Detection is pattern-based — no DNS/MX lookup is performed. "Undeliverable" means the address
 * was evidently constructed from a place name and must not be used; some such domains exist
 * (e.g. a town hall's) and would reach an unrelated party rather than bounce.
 */

export const SHARED_CONTACT_THRESHOLD = 5;

/** Consumer webmail & ISP domains indicating private individual / farmer ownership (GDPR Article 6 risk). */
export const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.fr',
  'yahoo.de',
  'yahoo.it',
  'yahoo.co.uk',
  'hotmail.com',
  'hotmail.fr',
  'hotmail.de',
  'hotmail.it',
  'hotmail.co.uk',
  'outlook.com',
  'outlook.fr',
  'outlook.de',
  'wanadoo.fr',
  'orange.fr',
  'free.fr',
  'sfr.fr',
  'laposte.net',
  'skynet.be',
  'gmx.de',
  'gmx.net',
  'gmx.at',
  'web.de',
  't-online.de',
  'bluewin.ch',
  'libero.it',
  'virgilio.it',
  'icloud.com',
  'me.com',
  'mail.ru',
  'protonmail.com',
  'proton.me',
  'fastmail.com',
]);

/** Grid operators, transmission system operators, and distribution utility customer lines. */
export const GRID_OPERATOR_SWITCHBOARDS = new Set([
  'ambergrid.lt',
  'conexus.lv',
  'floene.pt',
  'tsoua.com',
  'nedgia.es',
  'redexis.es',
  'grdf.fr',
  'grtgaz.com',
  'terega.fr',
  'enexis.nl',
  'liander.nl',
  'stedin.net',
  'snam.it',
  'creos.net',
  'enagas.es',
  'cadentgas.com',
  'sgn.co.uk',
  'wwutilities.co.uk',
  'northerngasnetworks.co.uk',
]);

/** Major verified corporate biomethane producers in France. */
const KNOWN_AUTHENTIC_FRENCH_CORPORATES = new Set([
  'totalenergies.com',
  'engie.com',
  'grdf.fr',
  'grtgaz.com',
  'terega.fr',
  'airliquide.com',
  'veolia.com',
  'suez.com',
  'dalkia.fr',
  'paprec.com',
  'siaap.fr',
  'trifyl.fr',
  'dijon-cereales.fr',
  'agrial.com',
  'terrena.fr',
  'saria.fr',
  'fonroche.fr',
  'waga-energy.com',
  'evergaz.com',
  'valogreen.com',
  'naskeo.com',
  'idex.fr',
  'seche-environnement.com',
  'bionersis.com',
]);

export interface ContactFrequencyIndex {
  emailCounts: Map<string, number>;
  phoneCounts: Map<string, number>;
}

export function buildContactFrequencyIndex(plants: BiomethanePlant[]): ContactFrequencyIndex {
  const emailCounts = new Map<string, number>();
  const phoneCounts = new Map<string, number>();

  for (const p of plants) {
    if (p.contactEmail && p.contactEmail.includes('@')) {
      const email = p.contactEmail.trim().toLowerCase();
      emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
    }
    if (p.contactPhone) {
      const phone = p.contactPhone.trim();
      if (phone.length >= 5) {
        phoneCounts.set(phone, (phoneCounts.get(phone) ?? 0) + 1);
      }
    }
  }

  return { emailCounts, phoneCounts };
}

export function normalizeToSlug(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function isPersonalEmailDomain(domain: string): boolean {
  return PERSONAL_EMAIL_DOMAINS.has(domain.toLowerCase().trim());
}

export function isTruncatedInventedMailbox(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const mailbox = email.toLowerCase().split('@')[0];
  if (!mailbox.startsWith('contact.')) return false;
  // Detect truncated auto-generated inbox tags:
  // 1. Ending with -[a-z]{1,2} e.g. contact.centrale-biogaz-de-m@totalenergies.com, contact.air-liquide-biogaz-c@airliquide.com, contact.agriopale-energie-sa@agriopale.fr
  // 2. Specific truncated word endings generated at character truncation boundaries:
  //    e.g. bioma, methanisati, labess
  if (/-[a-z]{1,2}$/.test(mailbox)) return true;
  if (/-(bioma|methanisati|labess)$/.test(mailbox)) return true;
  if (mailbox.length >= 26 && mailbox.length <= 29 && (mailbox.endsWith('bioma') || mailbox.endsWith('methanisati') || mailbox.endsWith('labess'))) {
    return true;
  }
  return false;
}

export function isDeadOrSyntheticDomain(
  email: string | null | undefined,
  plantName: string,
  _operator?: string | null,
  _website?: string | null,
  _countryCode?: string
): boolean {
  if (!email || !email.includes('@')) return false;
  if (isTruncatedInventedMailbox(email)) return true;

  const parts = email.toLowerCase().trim().split('@');
  const domain = parts[1] || '';
  if (KNOWN_AUTHENTIC_FRENCH_CORPORATES.has(domain)) return false;

  const domainBase = domain.split('.')[0] || '';
  const domainClean = normalizeToSlug(domainBase);
  const plantSlug = normalizeToSlug(plantName);

  // Synthetic dead pattern: email is contact@<plant-name-slug>.<tld>
  if (parts[0] === 'contact' && plantSlug.length >= 3) {
    const isExactName = domainClean === plantSlug;
    const isPrefixMatch = plantSlug.length >= 6 && (domainClean.startsWith(plantSlug.slice(0, 8)) || plantSlug.startsWith(domainClean));
    if (isExactName || isPrefixMatch) {
      return true;
    }
  }

  return false;
}

export function isOperatorRegionalMismatch(
  plantName: string | null | undefined,
  operator: string | null | undefined
): boolean {
  if (!operator || !plantName) return false;
  const op = operator.toLowerCase();
  const name = plantName.toLowerCase();

  // e.g. Boden (far north Sweden) listing Gothenburg's wastewater company Gryaab AB (Göteborg)
  if (name.includes('boden') && (op.includes('göteborg') || op.includes('gryaab'))) {
    return true;
  }

  // Stockholm Vatten och Avfall AB assigned across distant Swedish regions (Gotland, Gävle, Kalmar, Östersund, Ulricehamn)
  if (
    op.includes('stockholm vatten') &&
    !name.includes('stockholm') &&
    !name.includes('huddinge') &&
    !name.includes('lidingö') &&
    !name.includes('henriksdal')
  ) {
    return true;
  }

  return false;
}

export function isOperatorDomainMismatch(
  operator: string | null | undefined,
  contactEmail: string | null | undefined,
  corporateWebsite?: string | null,
  plantName?: string
): boolean {
  if (!operator || !contactEmail || !contactEmail.includes('@')) return false;

  // Regional geographic discrepancy
  if (plantName && isOperatorRegionalMismatch(plantName, operator)) {
    return true;
  }

  const op = operator.toLowerCase();
  const domain = contactEmail.toLowerCase().split('@')[1] || '';

  // Verbio plant listing EnviTec, VNG, or BayWa
  if (op.includes('verbio') && (domain.includes('envitec') || domain.includes('vng') || domain.includes('baywa'))) {
    return true;
  }

  // Nature Energy / Shell listing an unrelated company
  if ((op.includes('nature energy') || op.includes('shell')) &&
      !domain.includes('natureenergy') && !domain.includes('shell') && !domain.includes('hvidbjerg')) {
    return true;
  }

  // TotalEnergies listing unrelated third party
  if (op.includes('totalenergies') && !domain.includes('total') && !domain.includes('fonroche')) {
    return true;
  }

  // EnviTec plant listing unrelated entity
  if (op.includes('envitec') && !domain.includes('envitec')) {
    return true;
  }

  // ENGIE plant listing unrelated entity
  if (op.includes('engie') && !domain.includes('engie') && !domain.includes('storengy')) {
    return true;
  }

  // Swedish utility Stockholm Vatten och Avfall AB (svoa.se) on non-Stockholm plant
  if (domain.includes('svoa.se') || domain.includes('stockholmvatten')) {
    if (plantName && !plantName.toLowerCase().includes('stockholm') && !plantName.toLowerCase().includes('huddinge') && !plantName.toLowerCase().includes('lidingö')) {
      return true;
    }
  }

  // Gryaab AB (info@gryaab.se) on non-Gothenburg plant
  if (domain.includes('gryaab.se') && plantName && !plantName.toLowerCase().includes('göteborg')) {
    return true;
  }

  return false;
}

export function evaluatePlantContactQuality(
  plant: BiomethanePlant,
  index?: ContactFrequencyIndex
): PlantContactQuality {
  const email = (plant.contactEmail || '').trim().toLowerCase();
  const phone = (plant.contactPhone || '').trim();
  const hasEmail = Boolean(email && email.includes('@'));
  const hasPhone = Boolean(phone && phone.length >= 5);
  const domain = hasEmail ? email.split('@')[1] : '';

  const emailCount = hasEmail && index ? (index.emailCounts.get(email) ?? 1) : 1;
  const phoneCount = hasPhone && index ? (index.phoneCounts.get(phone) ?? 1) : 1;

  const isSharedEmail = emailCount >= SHARED_CONTACT_THRESHOLD;
  const isSharedPhone = phoneCount >= SHARED_CONTACT_THRESHOLD;
  const isPersonal = hasEmail && isPersonalEmailDomain(domain);
  const isInventedMailbox = hasEmail && isTruncatedInventedMailbox(email);
  const isDeadDomain = hasEmail && isDeadOrSyntheticDomain(
    email,
    plant.name,
    plant.operator,
    plant.corporateWebsite,
    plant.countryCode
  );
  const isRegionalMismatch = isOperatorRegionalMismatch(plant.name, plant.operator);
  const isOperatorMismatch = isOperatorDomainMismatch(plant.operator, email, plant.corporateWebsite, plant.name);
  const isGridOperatorSwitchboard = hasEmail && GRID_OPERATOR_SWITCHBOARDS.has(domain);

  const reasons: string[] = [];
  let gdprWarning: string | undefined;

  if (isPersonal) {
    gdprWarning = 'Personal mailbox (likely a farmer or sole trader). Under the ePrivacy rules (Directive 2002/58/EC Art. 13 and national equivalents such as PECR), unsolicited marketing email to individuals generally needs prior consent. Prefer phone, or a registered business contact.';
    reasons.push(gdprWarning);
  }

  if (isInventedMailbox) {
    reasons.push('Invented / truncated mailbox on a corporate domain (auto-generated inbox prefix cut off mid-word). Do not use.');
  }

  if (isDeadDomain) {
    reasons.push("Synthetic address: constructed from the plant's place name. It will bounce or reach an unrelated party (e.g. the town hall). Do not use.");
  }

  if (isSharedEmail) {
    reasons.push(`Shared email address: Listed across ${emailCount} different facilities. Reaches a central corporate group switchboard, not the plant commercial manager.`);
  }

  if (isSharedPhone) {
    reasons.push(`Shared telephone switchboard: Listed across ${phoneCount} different facilities (e.g. EPC contractor, developer head office, or utility line).`);
  }

  if (isGridOperatorSwitchboard) {
    reasons.push(`Grid operator contact: Email domain belongs to gas TSO/DSO (${domain}), not the biomethane asset owner.`);
  }

  if (isRegionalMismatch) {
    reasons.push(`Operator regional discrepancy: Operating entity (${plant.operator}) is located in a distant region or municipality from facility (${plant.name}). Desk verification in national register required.`);
  } else if (isOperatorMismatch) {
    reasons.push(`Operator discrepancy: Facility operator (${plant.operator}) does not match contact domain (${domain}). You would be contacting an unrelated entity.`);
  }

  // Determine overall confidence tier
  let confidence: ContactConfidence = 'UNVERIFIED_LEAD';
  let confidenceLabel = 'Unverified Lead';
  let confidenceBadgeColor: 'red' | 'amber' | 'blue' | 'slate' = 'blue';

  if (!hasEmail && !hasPhone) {
    confidence = 'NO_CONTACT';
    confidenceLabel = 'No Contact Published';
    confidenceBadgeColor = 'slate';
    reasons.push('No direct commercial contact details published for this facility.');
  } else if (isDeadDomain || isInventedMailbox) {
    confidence = 'UNDELIVERABLE';
    confidenceLabel = 'Synthetic Address — Do Not Use';
    confidenceBadgeColor = 'red';
  } else if (isSharedEmail || isSharedPhone || isOperatorMismatch || isGridOperatorSwitchboard) {
    confidence = 'INDIRECT';
    confidenceLabel = 'Indirect / Shared Switchboard';
    confidenceBadgeColor = 'amber';
  } else {
    confidence = 'UNVERIFIED_LEAD';
    confidenceLabel = 'Unverified Lead (Desk Verification Required)';
    confidenceBadgeColor = 'blue';
    reasons.push('Syntax passes basic structure checks, but active mailbox delivery and commercial signatory authority have not been verified.');
  }

  const officialRegister = getOfficialRegisterForCountry(
    plant.countryCode,
    plant.companyRegistrationId || plant.operator || plant.name
  );

  return {
    confidence,
    confidenceLabel,
    confidenceBadgeColor,
    reasons,
    isPersonalEmail: isPersonal,
    isSharedEmail,
    sharedEmailCount: emailCount,
    isSharedPhone,
    sharedPhoneCount: phoneCount,
    isDeadDomain,
    isInventedMailbox,
    isOperatorMismatch,
    isGridOperatorSwitchboard,
    gdprWarning,
    officialRegister,
  };
}

