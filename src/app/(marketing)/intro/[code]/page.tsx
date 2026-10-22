import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitIntro } from "./actions";
import { IntroForm } from "./intro-form";

export const metadata: Metadata = { title: "Tell us about your chapter" };

type IntroSchool = { university_name: string; city: string | null; state: string | null; image_url: string | null };

export default async function IntroPage({ params }: PageProps<"/intro/[code]">) {
  const { code } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("intro_university", { p_code: code });
  const school = (Array.isArray(data) ? data[0] : data) as IntroSchool | undefined;
  if (error || !school?.university_name) notFound();
  const place = [school.city, school.state].filter(Boolean).join(", ");
  return (
    <div className="mx-auto grid max-w-5xl items-start gap-10 px-6 py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:py-20">
      <div>
        <div className="overflow-hidden rounded-lg border border-line bg-subtle">
          {school.image_url ? <img src={school.image_url} alt="" className="aspect-[16/10] w-full object-cover" /> : <div className="aspect-[16/10]" />}
        </div>
        <h1 className="mt-6 font-serif text-4xl font-semibold tracking-tight">{school.university_name}</h1>
        {place ? <p className="mt-2 text-ink-3">{place}</p> : null}
        <p className="mt-5 text-lg text-ink-2">
          Amare Carey and Owen Caldwell are building GreekGeek at the University of Missouri. If your chapter wants a look, tell us who you are and how to reach you.
        </p>
      </div>
      <div className="rounded-lg border border-line bg-surface px-5 py-6 sm:px-6">
        <h2 className="text-lg font-semibold text-ink">Your chapter</h2>
        <IntroForm action={submitIntro.bind(null, code)} />
      </div>
    </div>
  );
}
