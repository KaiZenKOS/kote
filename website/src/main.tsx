Exit code: 0
Wall time: 1.1 seconds
Output:
import { createRoot } from 'react-dom/client'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, BadgeCheck, Check, ChevronRight, Compass, Download, MapPin, Menu, MessageCircle, Moon, Search, ShieldCheck, Smartphone, Store, Sun, X } from 'lucide-react'
import './site-v3.css'
import './night-theme.css'
import './hero-cleanup.css'
import './logo-overrides.css'
import './launch-ready.css'

const nav = [
  { href: '#/', label: 'Accueil' },
  { href: '#/fonctionnement', label: 'Fonctionnement' },
  { href: '#/commerces', label: 'Commerces' },
  { href: '#/tarifs', label: 'Tarifs' },
]

type Icon = typeof Search
type DetailData = { eyebrow: string; title: ReactNode; lead: string; cards: Array<[string, string, Icon]> }

function Brand({ inverse = false }: { inverse?: boolean }) {
  return <a className={`brand-v3 ${inverse ? 'inverse' : ''}`} href="#/" aria-label="KotÃ©, accueil"><img src="/images/kote-mark-day.png" alt="" /></a>
}

function Header({ path }: { path: string }) {
  const [open, setOpen] = useState(false)
  return <header className="header-v3"><Brand /><nav>{nav.map(item => <a className={item.href === path ? 'active' : ''} href={item.href} key={item.href}>{item.label}</a>)}</nav><a className="header-cta" href="#/commerces">RÃ©fÃ©rencer mon commerce <ArrowRight size={15} /></a><button className="menu-v3" aria-label="Ouvrir le menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>{open && <div className="mobile-v3">{nav.map(item => <a href={item.href} onClick={() => setOpen(false)} key={item.href}>{item.label}<ChevronRight size={16} /></a>)}<a href="#/commerces" onClick={() => setOpen(false)}>RÃ©fÃ©rencer mon commerce <ArrowRight size={16} /></a></div>}</header>
}

function Action({ children, muted = false, href = '#/fonctionnement' }: { children: ReactNode; muted?: boolean; href?: string }) {
  return <a className={`action-v3 ${muted ? 'muted' : ''}`} href={href}>{children}<ArrowRight size={17} /></a>
}

function Home() {
  return <>
    <section className="hero-v3"><div className="hero-copy-v3"><p className="eyebrow-v3"><i /> LE QUARTIER, EN CLAIR</p><h1>Tout ce qui compte,<br /><em>juste Ã  cÃ´tÃ©.</em></h1><p className="hero-description">KotÃ© rend les commerces, artisans et bonnes adresses de LomÃ© faciles Ã  trouver â€” sans dÃ©tour, sans information floue.</p><div className="hero-actions-v3"><Action>Explorer KotÃ©</Action><Action muted href="#/commerces">Je tiens un commerce</Action></div><div className="hero-meta"><span><ShieldCheck size={16} /> Contacts protÃ©gÃ©s</span><span><BadgeCheck size={16} /> Fiches vÃ©rifiÃ©es</span></div></div><div className="hero-object-v3"><div className="hero-orbit orbit-a" /><div className="hero-orbit orbit-b" /><div className="hero-image-v3"><img src="/images/kote-lome-market-hero.png" alt="Des habitantes de LomÃ© retrouvent un commerce de quartier" /></div><p className="object-label">LOMÃ‰ / TOGO<br />UNE ADRESSE AU BON MOMENT</p></div></section>
    <section className="value-v3"><p>Le commerce local ne devrait pas Ãªtre<br /><em>un secret bien gardÃ©.</em></p><span>01 / Lâ€™ESSENTIEL</span></section>
    <section className="snapshot-v3"><div className="section-head-v3"><p className="eyebrow-v3"><i /> SIMPLE PAR NATURE</p><h2>Trois gestes.<br /><em>Une vraie rencontre.</em></h2></div><div className="snapshot-steps"><article><span>01</span><Search /><h3>Cherchez</h3><p>Une activitÃ©, un produit ou un service prÃ¨s de vous.</p></article><article><span>02</span><Compass /><h3>RepÃ©rez</h3><p>Des indications de quartier que vous comprenez vraiment.</p></article><article><span>03</span><MessageCircle /><h3>Ã‰changez</h3><p>Contactez directement la bonne personne, au bon moment.</p></article></div><Action href="#/fonctionnement">Voir comment KotÃ© fonctionne</Action></section>
    <DemoStrip />
    <section className="proof-v3"><div><p className="eyebrow-v3 inverse"><i /> UNE CONFIANCE LISIBLE</p><h2>On ne vous demande pas<br />de croire. <em>On vous montre.</em></h2></div><div className="proof-list"><p><BadgeCheck /><span><b>ConfirmÃ©e rÃ©cemment</b> Lâ€™activitÃ© reste suivie.</span></p><p><ShieldCheck /><span><b>VÃ©rifiÃ©e sur le terrain</b> Le repÃ¨re existe rÃ©ellement.</span></p><p><MessageCircle /><span><b>Contact sous contrÃ´le</b> Votre profil protÃ¨ge lâ€™Ã©change.</span></p></div></section>
    <section className="merchant-v3"><div className="merchant-symbol"><img src="/images/kote-mark-day.png" alt="" /><span>VOTRE<br />VISIBILITÃ‰</span></div><div><p className="eyebrow-v3"><i /> VOUS TENEZ UN COMMERCE ?</p><h2>Votre quartier<br />vous cherche dÃ©jÃ .</h2><p>Une prÃ©sence claire. Vos horaires, vos photos, vos repÃ¨res. Vous gardez la main sur votre activitÃ©.</p><Action href="#/commerces">DÃ©couvrir lâ€™espace commerce</Action></div></section>
  </>
}

function DemoStrip() {
  return <section className="demo-strip"><div><p className="eyebrow-v3"><i /> DANS VOTRE POCHE</p><h2>Une adresse,<br /><em>pas une Ã©nigme.</em></h2><p>KotÃ© vous accompagne du besoin au bon commerce : recherchez, vÃ©rifiez, puis lancez lâ€™itinÃ©raire quand vous Ãªtes prÃªt.</p><Action href="#/telecharger">DÃ©couvrir lâ€™application</Action></div><div className="phone-demo" aria-label="AperÃ§u de l'application KotÃ©"><div className="phone-speaker" /><div className="phone-screen"><div className="phone-title"><span>Bonjour ðŸ‘‹</span><b>Autour de vous</b></div><div className="phone-search"><Search size={14} /> Que cherchez-vous ?</div><div className="phone-place"><span className="phone-avatar">A</span><div><b>Atelier Afiavi</b><small><MapPin size={11} /> Ã€ 400 m Â· Couture</small></div><BadgeCheck size={17} /></div><button type="button">Voir lâ€™itinÃ©raire <ArrowRight size={14} /></button></div></div></section>
}

const pageContent: Record<string, DetailData> = {
  '#/fonctionnement': { eyebrow: 'LE FONCTIONNEMENT', title: <>Un trajet plus court.<br /><em>Un quartier plus proche.</em></>, lead: 'KotÃ© prend les informations utiles et les rend visibles au moment oÃ¹ vous en avez besoin.', cards: [['Chercher', 'Dites simplement ce que vous cherchez.', Search], ['Choisir', 'Comparez les repÃ¨res, horaires et informations suivies.', Compass], ['Contacter', 'Ã‰changez avec le commerce sans rendre son numÃ©ro public.', MessageCircle]] },
  '#/commerces': { eyebrow: 'POUR LES COMMERÃ‡ANTS', title: <>Votre adresse mÃ©rite<br /><em>dâ€™Ãªtre trouvÃ©e.</em></>, lead: 'KotÃ© transforme votre prÃ©sence locale en fiche utile, claire et rassurante pour les habitants du quartier.', cards: [['CrÃ©er', 'PrÃ©sentez votre activitÃ©, vos horaires et vos repÃ¨res.', Store], ['Certifier', 'Faites vÃ©rifier votre activitÃ© lors dâ€™un passage terrain.', ShieldCheck], ['Grandir', 'Choisissez une mise en avant locale quand vous en avez besoin.', BadgeCheck]] },
  '#/a-propos': { eyebrow: 'NOTRE MISSION', title: <>La vie locale<br /><em>en premiÃ¨re ligne.</em></>, lead: 'Nous voulons que les commerces et les services qui font vivre LomÃ© soient aussi simples Ã  retrouver quâ€™ils sont essentiels au quotidien.', cards: [['Local', 'Des repÃ¨res ancrÃ©s dans les usages de chaque quartier.', MapPin], ['Direct', 'Une relation entre habitant et commerce, sans intermÃ©diaire.', MessageCircle], ['Transparent', 'Des signaux de confiance simples, jamais opaques.', ShieldCheck]] },
}

function DetailPage({ data }: { data: DetailData }) { return <section className="detail-v3"><div className="detail-intro"><p className="eyebrow-v3"><i /> {data.eyebrow}</p><h1>{data.title}</h1><p>{data.lead}</p></div><div className="detail-cards">{data.cards.map(([title, text, Icon], index) => <article key={title}><span>0{index + 1}</span><Icon /><h2>{title}</h2><p>{text}</p></article>)}</div>{data.eyebrow === 'LE FONCTIONNEMENT' && <Action href="#/telecharger">Voir la dÃ©mo de lâ€™application</Action>}</section> }

const offers = [{ name: 'Essentiel', price: '0', desc: 'Pour Ãªtre trouvÃ©, simplement.', points: ['Fiche commerce', 'RepÃ¨re et horaires', 'Demandes de contact protÃ©gÃ©es'] }, { name: 'KotÃ© Pro', price: '3 000', desc: 'Pour devenir lâ€™adresse de rÃ©fÃ©rence.', points: ['Tout Essentiel', 'Certification terrain', 'Photos et statistiques', 'Mise en avant locale'], featured: true }, { name: 'KotÃ© Pro+', price: '7 500', desc: 'Pour les commerces qui accÃ©lÃ¨rent.', points: ['Tout KotÃ© Pro', 'Plusieurs points de vente', 'Promotions locales', 'Support prioritaire'] }]
function PricingPage() { return <section className="pricing-v3"><div className="pricing-intro-v3"><p className="eyebrow-v3"><i /> DES OFFRES CLAIRES</p><h1>ÃŠtre visible.<br /><em>Rester libre.</em></h1><p>Les habitants utilisent KotÃ© gratuitement. Chaque commerce choisit le niveau dâ€™accompagnement qui lui convient.</p></div><div className="pricing-grid-v3">{offers.map(offer => <article className={offer.featured ? 'featured' : ''} key={offer.name}>{offer.featured && <b className="offer-chip">LE PLUS CHOISI</b>}<h2>{offer.name}</h2><p className="offer-price"><strong>{offer.price}</strong> FCFA <small>/ mois</small></p><p className="offer-desc">{offer.desc}</p><ul>{offer.points.map(point => <li key={point}><Check size={15} />{point}</li>)}</ul><Action href="#/contact">Choisir cette offre</Action></article>)}</div><p className="cert-note"><BadgeCheck size={18} /> La certification KotÃ© repose sur une vÃ©rification rÃ©elle sur le terrain â€” elle ne sâ€™achÃ¨te pas seule.</p></section> }

const faqs = [
  ['Comment un commerce est-il certifiÃ© ?', 'La certification est accordÃ©e aprÃ¨s une vÃ©rification de lâ€™activitÃ© et de son repÃ¨re sur le terrain. Une offre payante ne remplace jamais cette vÃ©rification.'],
  ['Mon numÃ©ro est-il visible par tout le monde ?', 'Non. KotÃ© privilÃ©gie les demandes de contact et les Ã©changes contrÃ´lÃ©s. Le commerÃ§ant dÃ©cide des informations quâ€™il rend publiques.'],
  ['KotÃ© est-il gratuit pour les habitants ?', 'Oui. La recherche des commerces et des services reste gratuite pour les personnes qui utilisent lâ€™application.'],
  ['Puis-je lancer un itinÃ©raire ?', 'Oui, lorsquâ€™un repÃ¨re est disponible, KotÃ© propose dâ€™ouvrir lâ€™itinÃ©raire dans lâ€™application de navigation de votre choix.'],
]
function FaqPage() { const [open, setOpen] = useState(0); return <section className="faq-page"><div className="detail-intro"><p className="eyebrow-v3"><i /> QUESTIONS COURANTES</p><h1>On vous rÃ©pond.<br /><em>Simplement.</em></h1><p>Les rÃ©ponses aux questions que lâ€™on se pose avant de rejoindre KotÃ©.</p></div><div className="faq-list">{faqs.map(([question, answer], index) => <article key={question}><button type="button" onClick={() => setOpen(open === index ? -1 : index)} aria-expanded={open === index}><span>{question}</span><ChevronRight /></button>{open === index && <p>{answer}</p>}</article>)}</div><Action href="#/contact">Une autre question ?</Action></section> }

function DownloadPage() { return <section className="download-page"><div><p className="eyebrow-v3"><i /> BIENTÃ”T DISPONIBLE</p><h1>KotÃ© arrive<br /><em>sur votre tÃ©lÃ©phone.</em></h1><p>La premiÃ¨re version Android est en cours de prÃ©paration. Rejoignez les premiers commerces et habitants Ã  tester KotÃ© Ã  LomÃ©.</p><div className="download-note"><Smartphone size={19} /><span><b>Android en prioritÃ©</b> Lâ€™APK sera proposÃ© ici dÃ¨s la mise en ligne officielle.</span></div><Action href="#/contact">ÃŠtre informÃ© du lancement</Action></div><div className="download-card"><Download size={34} /><b>Version de lancement</b><span>Recherche locale Â· profils protÃ©gÃ©s Â· itinÃ©raires</span><small>Installation prochaine</small></div></section> }

function ContactPage() {
  const [sent, setSent] = useState(false)
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSent(true) }
  return <section className="contact-page"><div className="detail-intro"><p className="eyebrow-v3"><i /> PARLONS-EN</p><h1>Une question,<br /><em>un projet ?</em></h1><p>Vous souhaitez rÃ©fÃ©rencer un commerce, tester KotÃ© ou simplement Ã©changer avec nous ? Laissez un message.</p></div><form className="contact-form" onSubmit={submit}>{sent ? <div className="form-success"><BadgeCheck size={28} /><h2>Message prÃ©parÃ©.</h2><p>La connexion Ã  la boÃ®te de rÃ©ception sera activÃ©e lors du dÃ©ploiement. En attendant, cette interface est prÃªte pour Ãªtre reliÃ©e Ã  lâ€™adresse de contact KotÃ©.</p></div> : <><label>Votre nom<input required name="name" autoComplete="name" placeholder="Votre nom" /></label><label>Votre e-mail<input required type="email" name="email" autoComplete="email" placeholder="vous@exemple.com" /></label><label>Votre message<textarea required name="message" rows={5} placeholder="Dites-nous ce dont vous avez besoin." /></label><button type="submit">PrÃ©parer mon message <ArrowRight size={16} /></button><small>En envoyant ce formulaire, vous acceptez notre politique de confidentialitÃ©.</small></>}</form></section>
}

function LegalPage({ kind }: { kind: 'privacy' | 'terms' | 'legal' }) {
  const content = kind === 'privacy' ? { eyebrow: 'VOS DONNÃ‰ES', title: 'Politique de confidentialitÃ©', intro: 'Cette version prÃ©sente les principes appliquÃ©s par KotÃ©. Elle devra Ãªtre complÃ©tÃ©e avec les coordonnÃ©es de lâ€™Ã©diteur et de lâ€™hÃ©bergeur avant publication.', sections: [['Ce que nous traitons', 'Les informations de profil, les informations publiÃ©es par les commerces, et les demandes de contact nÃ©cessaires au fonctionnement du service.'], ['Pourquoi', 'Pour afficher les fiches, sÃ©curiser les Ã©changes, vÃ©rifier les commerces et amÃ©liorer le service.'], ['Vos choix', 'Vous pouvez demander lâ€™accÃ¨s, la rectification ou la suppression de vos donnÃ©es, selon le cadre lÃ©gal applicable.']] } : kind === 'terms' ? { eyebrow: 'UTILISER KOTÃ‰', title: 'Conditions dâ€™utilisation', intro: 'Ces conditions encadrent lâ€™usage de KotÃ© par les habitants et les commerÃ§ants. Elles devront Ãªtre validÃ©es juridiquement avant mise en ligne.', sections: [['Un service local', 'KotÃ© met en relation, mais ne garantit ni la disponibilitÃ©, ni la qualitÃ© des produits et services proposÃ©s par les commerces.'], ['Informations justes', 'Chaque utilisateur sâ€™engage Ã  communiquer des informations exactes et Ã  respecter les autres utilisateurs.'], ['Certification', 'La certification indique une vÃ©rification du repÃ¨re et de lâ€™activitÃ© ; elle ne constitue pas une garantie commerciale.']] } : { eyebrow: 'INFORMATIONS Ã‰DITEUR', title: 'Mentions lÃ©gales', intro: 'Les informations dâ€™identification ci-dessous sont Ã  complÃ©ter par le porteur de projet avant toute diffusion publique.', sections: [['Ã‰diteur', 'KotÃ© â€” projet en cours de structuration. Raison sociale, adresse et numÃ©ro dâ€™entreprise : Ã  renseigner avant publication.'], ['HÃ©bergement', 'Les informations de lâ€™hÃ©bergeur seront indiquÃ©es une fois lâ€™infrastructure de production choisie.'], ['Contact', 'Une adresse de contact dÃ©diÃ©e sera ajoutÃ©e au lancement.']] }
  return <section className="legal-page"><div className="detail-intro"><p className="eyebrow-v3"><i /> {content.eyebrow}</p><h1>{content.title}</h1><p>{content.intro}</p></div><div className="legal-sections">{content.sections.map(([heading, text]) => <article key={heading}><h2>{heading}</h2><p>{text}</p></article>)}</div></section>
}

function NotFound() { return <section className="not-found-v3"><p className="eyebrow-v3"><i /> 404</p><h1>Cette adresse nâ€™est pas<br /><em>dans le quartier.</em></h1><Action href="#/">Revenir Ã  lâ€™accueil</Action></section> }

function Footer() { return <footer className="footer-v3"><div><Brand inverse /><p>Les bonnes adresses du quartier, enfin visibles.</p></div><div className="footer-links-v3"><section><b>DÃ‰COUVRIR</b><a href="#/fonctionnement">Fonctionnement</a><a href="#/telecharger">Lâ€™application</a><a href="#/a-propos">Notre mission</a></section><section><b>COMMERÃ‡ANTS</b><a href="#/commerces">CrÃ©er ma fiche</a><a href="#/tarifs">Tarifs et options</a><a href="#/faq">Questions frÃ©quentes</a></section><section><b>INFORMATIONS</b><a href="#/contact">Contact</a><a href="#/confidentialite">ConfidentialitÃ©</a><a href="#/mentions-legales">Mentions lÃ©gales</a></section></div><small>Â© 2026 KotÃ© Â· LomÃ©, Togo <span>Le quartier vous rÃ©pond.</span></small></footer> }

function App() {
  const [path, setPath] = useState(location.hash || '#/')
  const [theme, setTheme] = useState<'day' | 'night'>(() => localStorage.getItem('kote-theme') === 'night' ? 'night' : 'day')
  useEffect(() => { const update = () => setPath(location.hash || '#/'); addEventListener('hashchange', update); return () => removeEventListener('hashchange', update) }, [])
  useEffect(() => { localStorage.setItem('kote-theme', theme); window.scrollTo({ top: 0, behavior: 'instant' }) }, [theme, path])
  const page = path === '#/' ? <Home /> : path === '#/tarifs' ? <PricingPage /> : path === '#/faq' ? <FaqPage /> : path === '#/telecharger' ? <DownloadPage /> : path === '#/contact' ? <ContactPage /> : path === '#/confidentialite' ? <LegalPage kind="privacy" /> : path === '#/conditions"' ? <LegalPage kind="terms" /> : path === '#/mentions-legales' ? <LegalPage kind="legal" /> : pageContent[path] ? <DetailPage data={pageContent[path]} /> : <NotFound />
  return <div className="site-shell" data-theme={theme}><Header path={path} /><button className="theme-switch" onClick={() => setTheme(theme === 'day' ? 'night' : 'day')} aria-label={theme === 'day' ? 'Activer le thÃ¨me nuit' : 'Activer le thÃ¨me jour'}>{theme === 'day' ? <Moon size={16} /> : <Sun size={16} />}<span>{theme === 'day' ? 'Nuit' : 'Jour'}</span></button><main>{page}</main><Footer /></div>
}

createRoot(document.getElementById('app')!).render(<App />)


