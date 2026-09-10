import { MenuIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import React from "react"

type Props = {}

const Navbar = async (props: Props) => {
  return (
    <header className="fixed top-0 right-0 left-0 z-[100] flex items-center justify-between border-b-[1px] border-neutral-900 bg-black/40 px-4 py-4 backdrop-blur-lg">
      <aside className="flex items-center gap-[2px]">
        <p className="text-3xl font-bold">Za</p>
        <Image
          src="/zapieLogo.png"
          width={15}
          height={15}
          alt="fuzzie logo"
          className="shadow-sm"
        />
        <p className="text-3xl font-bold">pie</p>
      </aside>
      <nav className="absolute top-[50%] left-[50%] hidden translate-x-[-50%] translate-y-[-50%] transform md:block">
        <ul className="flex list-none items-center gap-4">
          <li>
            <Link href="#">Products</Link>
          </li>
          <li>
            <Link href="#">Pricing</Link>
          </li>
          <li>
            <Link href="#">Clients</Link>
          </li>
          <li>
            <Link href="#">Resources</Link>
          </li>
          <li>
            <Link href="#">Documentation</Link>
          </li>
          <li>
            <Link href="#">Enterprise</Link>
          </li>
        </ul>
      </nav>
      <aside className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="relative inline-flex h-10 overflow-hidden rounded-full p-[2px] focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 focus:outline-none"
        >
          <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
          <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
            {//work in progress we will change after authentication
            true ? "Dashboard" : "Get Started"}
          </span>
        </Link>
        {/* //user button  */}
        <MenuIcon className="md:hidden" /> 
      </aside>
    </header>
  )
}

export default Navbar
