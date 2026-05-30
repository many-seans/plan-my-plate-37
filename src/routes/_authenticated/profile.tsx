import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { LogOut, Heart } from "lucide-react";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Prepbowl" }] }),
  component: Profile,
});

const DIET_OPTIONS = ["Omnivore", "Vegetarian", "Vegan", "Pescatarian", "Keto", "Paleo", "Mediterranean", "Gluten-free", "Dairy-free"];
const COMMON_ALLERGIES = ["Nuts", "Peanuts", "Dairy", "Eggs", "Gluten", "Shellfish", "Soy", "Sesame"];

function Profile() {
  const fetchProfile = useServerFn(getProfile);
  const saveProfile = useServerFn(updateProfile);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [diet, setDiet] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [household, setHousehold] = useState(2);
  const [calories, setCalories] = useState(2000);

  useEffect(() => {
    if (!data) return;
    setName(data.display_name ?? "");
    setAvatar(data.avatar_url ?? "");
    setDiet(data.dietary_preferences ?? []);
    setAllergies(data.allergies ?? []);
    setHousehold(data.household_size ?? 2);
    setCalories(data.daily_calories ?? 2000);
  }, [data]);

  async function onSave() {
    try {
      await saveProfile({ data: {
        display_name: name || null,
        avatar_url: avatar || null,
        dietary_preferences: diet,
        allergies,
        household_size: household,
        daily_calories: calories,
      }});
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="px-5 pt-6">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">Personalize how plans are generated.</p>
      </header>

      <div className="space-y-4">
        <Card>
          <div>
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <div>
            <Label htmlFor="avatar">Avatar URL</Label>
            <Input id="avatar" value={avatar} onChange={(e) => setAvatar(e.target.value)} maxLength={500} placeholder="https://…" />
          </div>
        </Card>

        <Card>
          <Label>Dietary preferences</Label>
          <Chips options={DIET_OPTIONS} selected={diet} onToggle={(v) => setDiet((s) => s.includes(v) ? s.filter(x => x !== v) : [...s, v])} />
        </Card>

        <Card>
          <Label>Allergies / avoid</Label>
          <Chips options={COMMON_ALLERGIES} selected={allergies} onToggle={(v) => setAllergies((s) => s.includes(v) ? s.filter(x => x !== v) : [...s, v])} />
        </Card>

        <Card>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hh">Household size</Label>
              <Input id="hh" type="number" min={1} max={20} value={household} onChange={(e) => setHousehold(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
            </div>
            <div>
              <Label htmlFor="cal">Daily calories</Label>
              <Input id="cal" type="number" min={800} max={6000} step={50} value={calories} onChange={(e) => setCalories(Math.max(800, Math.min(6000, Number(e.target.value) || 2000)))} />
            </div>
          </div>
        </Card>

        <Button onClick={onSave} className="w-full rounded-full">Save profile</Button>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" className="rounded-full" onClick={() => navigate({ to: "/favorites" })}>
            <Heart className="mr-2 h-4 w-4" /> Favourites
          </Button>
          <Button variant="outline" className="rounded-full" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </Button>
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 rounded-2xl bg-card p-5 shadow-sm">{children}</div>;
}

function Chips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button key={o} onClick={() => onToggle(o)} type="button">
            <Badge variant={on ? "default" : "outline"} className={`cursor-pointer rounded-full px-3 py-1 text-sm ${on ? "" : "bg-background"}`}>
              {o}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
