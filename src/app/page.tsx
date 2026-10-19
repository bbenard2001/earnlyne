import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/SiteHeader';
import { HeroCalc } from '@/components/HeroCalc';

export default function Home() {
  return (
    <>
      <SiteHeader />
      <section className="hero">
        <div className="wrap">
          <div>
            <h1>
              Know what you&apos;re owed <em>before payroll tells you.</em>
            </h1>
            <p>
              earnlYne is a commission tracker for account executives. Set up your own comp plan, log deals, check every payout against your
              own math, and plan what to do with the money. No employer or CRM needed.
            </p>
            <div className="ctas">
              <Link className="btn teal" href="/signup">Start free</Link>
              <Link className="btn ghost" href="/pricing">See pricing</Link>
            </div>
          </div>
          <HeroCalc />
        </div>
      </section>
      <main className="wrap page">
        <div className="steps">
          <div className="panel step"><div className="n">STEP 1</div><h3>Create an account</h3><p>Just you. No team invite, no admin approval.</p></div>
          <div className="panel step"><div className="n">STEP 2</div><h3>Describe your comp plan</h3><p>Base salary and OTE, rate tiers, renewals, clawbacks, and how payouts are split.</p></div>
          <div className="panel step"><div className="n">STEP 3</div><h3>Log deals, check pay, plan the money</h3><p>See attainment and commission live, compare payouts to your pay stub, and split take-home pay into savings and investing.</p></div>
        </div>
        <p className="note">Your record stays yours if you change jobs. earnlYne never connects to your employer’s systems, and nothing you enter is shared.</p>
      </main>
      <SiteFooter />
    </>
  );
}
