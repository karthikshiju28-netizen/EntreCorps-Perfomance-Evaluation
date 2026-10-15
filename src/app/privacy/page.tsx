export const metadata = { title: 'Privacy Policy · EntreCorps Evaluations' };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-sm leading-6">
      <h1 className="mb-4 text-2xl font-semibold">Privacy Policy</h1>
      <p className="mb-3">EntreCorps Evaluations is an internal tool used by members of EntreCorps at the University of Illinois Urbana-Champaign to complete peer performance evaluations.</p>
      <h2 className="mt-6 font-semibold">What we collect</h2>
      <p className="mb-3">When you sign in with Google or an email link, we receive your name and email address. We store your roster details (name, email, role, project) and the evaluations you submit (scores and comments).</p>
      <h2 className="mt-6 font-semibold">How we use it</h2>
      <p className="mb-3">Your email is used only to identify you and show the evaluations you owe. Evaluations you submit are visible to you and to the EntreCorps Senior Leadership Team (SLT). Other members cannot see them.</p>
      <h2 className="mt-6 font-semibold">Sharing</h2>
      <p className="mb-3">We do not sell or share your information with anyone outside EntreCorps leadership. Data is stored with Supabase and the site is hosted on Vercel.</p>
      <h2 className="mt-6 font-semibold">Removal</h2>
      <p className="mb-3">To have your data removed, contact an SLT member or email kshiju2@illinois.edu.</p>
    </main>
  );
}
