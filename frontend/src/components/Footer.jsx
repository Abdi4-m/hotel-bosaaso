import { ArrowUpRight, Camera, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

const copyrightYear = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="bg-ink text-white"><div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-14 md:grid-cols-[1.3fr_.8fr_.8fr] md:px-10 md:py-20">
      <div><Link to="/" className="font-display text-3xl">Hotel Bosaso</Link><p className="mt-4 max-w-sm text-sm leading-6 text-white/60">A place to gather, settle in, and let the day take its time.</p><a href="https://instagram.com" className="mt-6 inline-flex items-center gap-2 text-sm text-white/75 transition-colors hover:text-white"><Camera size={16} /> Follow along <ArrowUpRight size={14} /></a></div>
      <div><p className="eyebrow text-[10px] text-white/45">Find us</p><p className="mt-4 flex items-start gap-3 text-sm leading-6 text-white/75"><MapPin size={17} className="mt-1 shrink-0" />kala xirir<br />Hotel bosaso</p><a href="tel:0907878147" className="mt-4 flex items-center gap-3 text-sm text-white/75 hover:text-white"><Phone size={17} /> 0907878147</a></div>
      <div><p className="eyebrow text-[10px] text-white/45">Explore</p><div className="mt-4 flex flex-col items-start gap-3 text-sm text-white/75"><Link className="hover:text-white" to="/menu">Restaurant & bar</Link><Link className="hover:text-white" to="/rooms">Rooms & suites</Link><Link className="hover:text-white" to="/contact">Get in touch</Link></div></div>
    </div><div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/40 md:px-10">© {copyrightYear} Hotel Bosaso. A slower kind of stay.</div>
    <link rel="stylesheet" href="09078781478" /> 907878147
    </footer>
  )
}