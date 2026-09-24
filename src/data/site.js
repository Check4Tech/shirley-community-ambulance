// Single source of truth for site content.
// Copy is carried over from shirleycommunityambulance.org, lightly edited for
// grammar and consistency. Non-technical editors should be able to change
// everything that appears on the site from this one file.

export const org = {
  name: 'Shirley Community Ambulance',
  shortName: 'SCA',
  tagline: 'Neighbors answering the call since 1977.',
  foundedYear: 1977,
  phone: '(631) 399-5380',
  phoneHref: 'tel:+16313995380',
  station: {
    label: 'Station',
    street: '3 Plymouth Place',
    city: 'Shirley',
    state: 'NY',
    zip: '11967',
    get full() {
      return `${this.street}, ${this.city}, ${this.state} ${this.zip}`
    },
  },
  mailing: {
    label: 'Mailing address',
    street: 'PO Box 72',
    city: 'Shirley',
    state: 'NY',
    zip: '11967',
    get full() {
      return `${this.street}, ${this.city}, ${this.state} ${this.zip}`
    },
  },
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=3+Plymouth+Place+Shirley+NY+11967',
  mapEmbedUrl:
    'https://www.google.com/maps?q=3+Plymouth+Place,+Shirley,+NY+11967&output=embed',
  facebook: 'https://www.facebook.com/1287290221391033',
  instagram: 'https://www.instagram.com/shirleyambulance/',
  donateUrl:
    'https://www.zeffy.com/en-US/donation-form/04b76ba1-f8ce-4a3a-b2a9-378aadef47d7',
  membersPath: '/members',
}

export const stats = [
  { value: '1,500+', label: 'Emergency calls answered last year' },
  { value: '24/7/365', label: 'On call, every hour of every day' },
  { value: '3', label: 'Ambulances, plus 2 first-response vehicles' },
  { value: `${new Date().getFullYear() - org.foundedYear}`, label: 'Years serving the Shirley community' },
]

export const aboutCopy = {
  lead: `${org.name} is a non-profit, volunteer organization whose purpose is to serve the emergency medical needs of the residents of the Shirley ambulance tax district in Shirley, New York. We have been doing it since ${org.foundedYear}.`,
  body: [
    'We operate out of one station protecting a primarily residential district, responding to over 1,500 alarms last year with three ambulances and two first-response vehicles. On call 24 hours a day, 365 days a year, our members answer 911 calls ranging from motor vehicle accidents and other traumatic injuries to major medical emergencies, along with stand-bys for fires, sporting events, and community events throughout the year.',
    'We provide both Basic Life Support and Advanced Life Support, and supply mutual aid to neighboring districts whenever requested. Our members spend hundreds — and in many cases thousands — of hours every year volunteering and training to become the best possible EMS providers, and the agency is committed to putting the best available equipment in their hands.',
  ],
}

export const partners = [
  'Brookhaven Fire Department',
  'Suffolk County Police Department',
  'Suffolk County Sheriff’s Department',
  'Suffolk County Park Police',
  'MTA Police',
]

export const capabilities = [
  {
    title: 'Advanced Life Support',
    body: 'Paramedic-level care including cardiac monitoring, advanced airway management, and medication administration.',
  },
  {
    title: 'Basic Life Support',
    body: 'EMT-staffed ambulances providing emergency care and transport for medical and traumatic emergencies.',
  },
  {
    title: 'First response',
    body: 'Two first-response vehicles get a provider on scene fast, ahead of the transporting ambulance.',
  },
  {
    title: 'Mutual aid',
    body: 'We back up neighboring districts whenever they request it, and they do the same for us.',
  },
]

export const directors = [
  {
    name: 'Marc Lampert',
    cert: 'EMT-CC',
    role: 'Chief of Operations',
    ext: '110',
    email: 'Mlampert@shirleyems.org',
  },
  {
    name: 'Michael Neuhaus',
    cert: 'EMT-P',
    role: '1st Assistant Chief',
    ext: '111',
    email: 'Shirley31@shirleyems.org',
  },
  {
    name: 'Arthur Reilly',
    cert: 'EMT-P',
    role: '2nd Assistant Chief',
    ext: '112',
    email: 'shirley32@shirleyems.org',
  },
  {
    name: 'Jack Dittler',
    cert: 'EMT-B',
    role: 'Secretary',
    ext: '113',
    email: 'Secretary@shirleyems.org',
  },
  {
    name: 'Skylar Edwards',
    cert: 'EMT-P',
    role: 'Treasurer',
    ext: '115',
    email: 'Treasurer@shirleyems.org',
  },
]

export const membershipCommittee = {
  members: [
    { name: 'Tracy Davis', cert: 'EMT-B' },
    { name: 'Kim Stavola', cert: 'EMT-B' },
  ],
  // Committee-level contact details, deliberately not attributed to an
  // individual so the site doesn't need editing when the roster changes.
  contact: {
    ext: '114',
    email: 'members@shirleyems.org',
  },
}

export const medicalDirectors = [
  { name: 'Joseph Artale', cert: 'DO' },
  { name: 'Jerry Rubano', cert: 'MD' },
]

export const studentAdvisors = [
  { name: 'Rachel Leuders', cert: 'EMT-B' },
  { name: 'Melissa Fiore', cert: 'EMT-B' },
  { name: 'Kayla Roof', cert: 'EMT-B' },
  { name: 'Emily Marmol', cert: 'EMT-B' },
  { name: 'Arthur Reilly', cert: 'EMT-B' },
]

/** Look an officer's address up by role so routing can't drift out of sync. */
const emailFor = (role) => directors.find((d) => d.role === role)?.email

/**
 * Where each form goes. Kept here so the agency can re-route a form without
 * touching component code.
 *
 * NOTE: when VITE_FORM_ENDPOINT is set, these are submitted as _to/_cc fields.
 * Most providers (Formspree, Basin, …) will not deliver to an arbitrary
 * address supplied by the client — the real recipient must also be configured
 * in the provider's dashboard. The fields are there so the intended routing is
 * recorded on the submission either way.
 */
export const formRecipients = {
  cprCourse: { to: emailFor('Secretary') },
  standby: {
    to: emailFor('2nd Assistant Chief'),
    cc: [emailFor('Chief of Operations'), emailFor('1st Assistant Chief')],
  },
  adultMembership: { to: membershipCommittee.contact.email },
  studentProgram: { to: membershipCommittee.contact.email },
  generalContact: { to: emailFor('Secretary') },
}

export const adultBenefits = [
  'Training and education in First Aid, CPR, EMT, Paramedic, and many related topics',
  'A potential career path in emergency medicine',
  'Full uniforms provided',
  'Property tax reduction',
  'New York State income tax reduction',
  'Service Award Program (similar to a pension)',
  'Free annual physical',
  'Free annual flu shot, for you and your family',
  'Book reimbursement for EMS classes at Suffolk County Community College',
  'College scholarships from New York State',
  'Paid life insurance and accident insurance',
  'Paid gym membership',
  'Annual installation dinner, picnic, and Christmas party',
]

export const adultRequirements = [
  '12 scheduled hours per week',
  'One training per month',
  'One meeting per month',
  'Enroll in and complete an EMT class within one year',
]

export const studentFaqs = [
  {
    q: 'How old do you have to be to join the program?',
    a: 'We accept applications for the student/youth program starting at 14 years old. Members aged 14–15 participate in meetings, trainings, and special events. At 16 you are automatically moved up and scheduled to ride the ambulance once per week. Any youth or student member must have working papers in order to ride — you can get these from your guidance counselor at school. We are currently accepting student and youth members residing in Suffolk County, NY only.',
  },
  {
    q: 'Do you have to be in high school to join?',
    a: 'Yes. All student and youth members must be enrolled in a high school or home-schooled. If you have received your GED or graduated early, you may also apply. Enrolled students must provide each quarter’s final report card and must pass all classes to remain in good standing. We take this seriously: gaining experience in the field is a great opportunity, but passing and graduating high school is far more important. Students failing one or more classes are placed on academic probation until the next quarter’s grades.',
  },
  {
    q: 'What kind of commitment is required?',
    a: 'Student members 16 and over are scheduled for one three-hour shift per week during the school year, and one four-hour shift per week over summer and school vacations. In addition to shift time, students and youth members attend one meeting or training per month. Please only apply if you can genuinely dedicate the time.',
  },
  {
    q: 'What else do student and youth members do?',
    a: 'Students and youth members run their own fundraising events throughout the year to pay for a group trip. The trip is chosen as a group and is fully covered by the money they raise. The program also takes part in agency events like parades, the company BBQ, the children’s holiday party, and the annual installation of officers dinner.',
  },
  {
    q: 'Is my child safe riding the ambulance?',
    a: 'Your child’s safety is our first priority. We will never place them in a situation where they are in harm’s way. Our members are trained to keep a close eye on students during any ambulance call and to use their best judgment about which calls students respond to.',
  },
  {
    q: 'Do you keep in contact with parents?',
    a: 'Of course. We want every parent and guardian to feel comfortable with their child riding with us. Parents are called regularly and kept in the loop on their child’s progress and time with the agency.',
  },
  {
    q: 'Does it cost anything to join?',
    a: 'The program is completely free. Members receive free uniforms and free training. If a student chooses to buy their own equipment, such as a stethoscope, the agency does not reimburse that cost.',
  },
  {
    q: 'What kind of training will my child receive?',
    a: 'The program teaches your child what they need to know to become an EMT. They receive a free CPR course including certification card, and learn basic first aid skills such as bleeding control, heat and cold emergencies, diabetic emergencies, vital signs, and allergic reactions. They will also learn to recognize stroke and heart attack symptoms in the back of a moving ambulance.',
  },
  {
    q: 'Can my child become an EMT through your agency?',
    a: 'Absolutely. We encourage all student members to enroll in an EMT course provided by Suffolk County Emergency Medical Services. Shirley Community Ambulance covers the cost and supplies for the class.',
  },
]

export const cprCourses = [
  { title: 'CPR / AED', body: 'Adult, child, and infant CPR with automated external defibrillator use.' },
  { title: 'First Aid (General)', body: 'Practical first aid for the workplace, home, and community groups.' },
  { title: 'BLS for Healthcare Providers', body: 'The American Heart Association course required for clinical staff and students.' },
]

export const standbyUnits = [
  { title: 'ALS ambulances', body: 'Paramedic-staffed transport units.' },
  { title: 'BLS ambulances', body: 'EMT-staffed transport units.' },
  { title: 'First responders', body: 'Rapid-response vehicles for fast on-scene coverage.' },
  { title: 'Fire rehab unit', body: 'Available for medical tents and mass-casualty incident support.' },
  { title: 'Bike team', body: 'Four bikes for crowded venues, festivals, and race courses.' },
]

export const gallery = [
  { src: '/images/hero-crew.jpg', alt: 'Three Shirley Community Ambulance rigs parked under the station apparatus bay canopy.', caption: 'The fleet at quarters' },
  { src: '/images/students.jpg', alt: 'Student program members in blue uniforms lined up in front of the Shirley Community Ambulance station between two ambulances.', caption: 'Student program class photo' },
  { src: '/images/station.jpg', alt: 'An ambulance parked beside a Suffolk County Police medevac helicopter on a landing zone at night.', caption: 'Medevac landing zone' },
  { src: '/images/youth-group.jpg', alt: 'Members holding a Shirley Community Ambulance banner in front of an ambulance during the winter holidays.', caption: 'Holiday detail' },
  { src: '/images/parade.jpg', alt: 'Formal group photograph of the full membership at the annual installation dinner.', caption: 'Annual installation dinner' },
  { src: '/images/ambulance.jpg', alt: 'Ambulance 5-38-18 responding with emergency lights on a wet roadway.', caption: 'Ambulance 18 responding', credit: '© Suffolk Fire Photos' },
]

export const fundraiser = {
  active: true,
  name: 'The Grand Getaway Raffle',
  blurb:
    'Two incredible travel prizes, one great cause. Only 400 tickets are being sold, so the odds have never looked better.',
  ticketCount: 400,
  ctaLabel: 'Purchase tickets',
  // Tickets were sold through the agency's donation platform on the original site.
  ctaUrl: org.donateUrl,
  prizes: [
    {
      title: 'Glittering Greek Isles',
      body: 'Island-hopping through the Aegean.',
      image: '/images/greek-isles.jpg',
      alt: 'Whitewashed buildings and blue domes above the sea in the Greek islands.',
    },
    {
      title: 'Riviera Maya Magic',
      body: 'Sun, sand, and cenotes on Mexico’s Caribbean coast.',
      image: '/images/riviera-maya.jpg',
      alt: 'Turquoise Caribbean water and palm trees on the Riviera Maya coastline.',
    },
  ],
}

export const donationUses = [
  { amount: '$25', body: 'Stocks a jump bag with bandages, gauze, and airway supplies.' },
  { amount: '$100', body: 'Covers a set of turnout gear items or a member’s uniform.' },
  { amount: '$500', body: 'Funds an EMT course seat for a new volunteer.' },
  { amount: 'Any amount', body: 'Goes straight into equipment, training, and keeping rigs in service.' },
]
