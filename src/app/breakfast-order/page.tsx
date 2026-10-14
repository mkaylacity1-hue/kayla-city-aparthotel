"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const LOGO_URL = "https://eleahodkxilnzqzjpozq.supabase.co/storage/v1/object/public/public-assets/Kayla%20City%20Logo%20Design.png";

type MenuItem = { id: string; category: string; item_name: string; display_order: number; };
type MenuByCategory = Record<string, string[]>;
type PersonOrder = Record<string, string> & { special_request?: string };

function buildEmptyOrder(categories: string[]): PersonOrder {
  const o: PersonOrder = {};
  categories.forEach((c) => { o[c] = ""; });
  return o;
}

export default function BreakfastOrderPage() {
  const [step, setStep] = useState<"room" | "breakfast" | "menu" | "done">("room");
  const [roomNumber, setRoomNumber] = useState("");
  const [reservation, setReservation] = useState<any>(null);
  const [menu, setMenu] = useState<MenuByCategory>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [specialFee, setSpecialFee] = useState<{ fee_ghs: number; fee_usd: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Per-person orders
  const [currentPerson, setCurrentPerson] = useState(0);
  const [personOrders, setPersonOrders] = useState<PersonOrder[]>([]);
  const [sameAsFirst, setSameAsFirst] = useState<boolean | null>(null);
  const [wantsSpecial, setWantsSpecial] = useState(false);
  const [specialRequest, setSpecialRequest] = useState("");

  const supabase = createClient();
  const totalPersons = reservation?.number_of_persons ?? 1;

  useEffect(() => {
    async function loadMenu() {
      const { data: menuItems } = await supabase
        .from("breakfast_menu")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      const { data: fee } = await supabase
        .from("breakfast_special_fee")
        .select("fee_ghs, fee_usd")
        .single();

      if (menuItems) {
        const byCategory: MenuByCategory = {};
        const cats: string[] = [];
        menuItems.forEach((item: MenuItem) => {
          if (!byCategory[item.category]) {
            byCategory[item.category] = [];
            cats.push(item.category);
          }
          byCategory[item.category].push(item.item_name);
        });
        setMenu(byCategory);
        setCategories(cats);
      }
      if (fee) setSpecialFee(fee);
    }
    loadMenu();
  }, []);

  async function handleRoomLookup() {
    if (!roomNumber.trim()) { setError("Please enter your room number"); return; }
    setLoading(true);
    setError("");

    const { data, error: err } = await supabase
      .from("reservations")
      .select("id, unit_id, check_out_date, number_of_persons, guest_first_name, guest_surname, unit:unit_id(unit_number)")
      .eq("status", "checked_in")
      .order("created_at", { ascending: false });

    setLoading(false);

    const match = data?.find((r: any) => r.unit?.unit_number?.toLowerCase() === roomNumber.trim().toLowerCase());
    if (err || !match) {
      setError("No active reservation found for this room. Please check your room number.");
      return;
    }

    setReservation(match);
    setPersonOrders([buildEmptyOrder(categories)]);
    setCurrentPerson(0);
    setSameAsFirst(null);
    setStep("breakfast");
  }

  function handleSelectItem(category: string, item: string) {
    setPersonOrders((prev) => {
      const updated = [...prev];
      updated[currentPerson] = { ...updated[currentPerson], [category]: item };
      return updated;
    });
  }

  function currentOrder() {
    return personOrders[currentPerson] ?? buildEmptyOrder(categories);
  }

  function isCurrentComplete() {
    return categories.every((c) => currentOrder()[c] !== "");
  }

  function handleNextPerson() {
    const next = currentPerson + 1;
    if (next < totalPersons) {
      if (!personOrders[next]) {
        setPersonOrders((prev) => [...prev, buildEmptyOrder(categories)]);
      }
      setCurrentPerson(next);
      setSameAsFirst(null);
    }
  }

  function handleSameAsFirst(same: boolean) {
    setSameAsFirst(same);
    if (same) {
      setPersonOrders((prev) => {
        const updated = [...prev];
        updated[currentPerson] = { ...personOrders[0] };
        return updated;
      });
    } else {
      setPersonOrders((prev) => {
        const updated = [...prev];
        updated[currentPerson] = buildEmptyOrder(categories);
        return updated;
      });
    }
  }

  async function handleSubmit() {
    if (!reservation) return;
    setLoading(true);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const forDate = tomorrow.toISOString().split("T")[0];

    const ordersToInsert = personOrders.map((order, idx) => ({
      reservation_id: reservation.id,
      unit_id: reservation.unit_id,
      for_date: forDate,
      is_special: wantsSpecial && idx === 0,
      number_of_guests: 1,
      status: "pending",
      notes: wantsSpecial && idx === 0
        ? JSON.stringify({ special_request: specialRequest })
        : JSON.stringify(order),
      total_fee_ghs: wantsSpecial && idx === 0 ? (specialFee?.fee_ghs ?? 50) : 0,
      total_fee_usd: wantsSpecial && idx === 0 ? (specialFee?.fee_usd ?? 5) : 0,
    }));

    const { error: err } = await (supabase.from("breakfast_orders") as any).insert(ordersToInsert);
    setLoading(false);
    if (err) { setError("Failed to submit. Please try again."); return; }
    setStep("done");
  }

  // ── DONE ──
  if (step === "done") return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="text-6xl mb-4">🌅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Submitted!</h1>
        <p className="text-gray-500 text-sm mb-1">Your breakfast order has been received.</p>
        <p className="text-gray-400 text-xs">Enjoy your evening and we'll see you at breakfast!</p>
        <div className="mt-6 h-1 w-16 rounded-full mx-auto" style={{ background: "#b76e79" }}></div>
        <p className="text-xs text-gray-400 mt-4">M'Kayla City ApartHotel</p>
      </div>
    </div>
  );

  // ── ROOM LOOKUP ──
  if (step === "room") return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <img src={LOGO_URL} alt="M'Kayla City ApartHotel" className="h-14 mx-auto mb-3" />
          <h1 className="text-white text-xl font-bold">Breakfast Order</h1>
          <p className="text-gray-400 text-sm mt-1">Order breakfast for tomorrow morning</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Your Room Number</label>
          <input
            type="text"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRoomLookup()}
            placeholder="e.g. 102"
            className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-lg font-bold text-center focus:outline-none focus:border-gray-900 mb-4"
          />
          {error && <p className="text-red-500 text-sm mb-3 text-center">{error}</p>}
          <button onClick={handleRoomLookup} disabled={loading}
            className="w-full text-white rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-50 transition-opacity"
            style={{ background: "#0a0a0a" }}>
            {loading ? "Looking up…" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── DO YOU WANT BREAKFAST ──
  if (step === "breakfast") return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <img src={LOGO_URL} alt="M'Kayla City ApartHotel" className="h-12 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Room {roomNumber} &bull; {totalPersons} guest{totalPersons > 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Good evening! 🌙</h2>
          <p className="text-gray-500 text-sm mb-5">Would you like to order breakfast for tomorrow morning?</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => { setWantsSpecial(false); setStep("menu"); }}
              className="w-full border-2 border-gray-900 rounded-2xl py-4 text-sm font-semibold hover:bg-gray-900 hover:text-white transition-colors">
              Yes — Order from menu
            </button>
            {specialFee && (
              <button onClick={() => { setWantsSpecial(true); setStep("menu"); }}
                className="w-full rounded-2xl py-4 text-sm font-semibold text-white transition-colors"
                style={{ background: "#b76e79" }}>
                Special Request — GHS {specialFee.fee_ghs.toFixed(2)} / person
              </button>
            )}
            <button onClick={() => setStep("done")}
              className="w-full border-2 border-gray-100 rounded-2xl py-4 text-sm font-medium text-gray-400 hover:bg-gray-50 transition-colors">
              No — Skip breakfast
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── SPECIAL REQUEST ──
  if (step === "menu" && wantsSpecial) return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-sm mx-auto flex flex-col gap-4 py-6">
        <div className="text-center">
          <img src={LOGO_URL} alt="M'Kayla City ApartHotel" className="h-10 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Room {roomNumber} &bull; Special Request</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
          <div className="rounded-2xl p-4 text-center" style={{ background: "#fff5f7" }}>
            <p className="text-sm font-semibold" style={{ color: "#b76e79" }}>Special Request Fee</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">GHS {specialFee?.fee_ghs.toFixed(2)}</p>
            <p className="text-xs text-gray-400">per person</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">What would you like? *</label>
            <textarea
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              placeholder="Please describe your breakfast preference in detail…"
              rows={4}
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-gray-900 resize-none"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button onClick={handleSubmit} disabled={loading || !specialRequest.trim()}
            className="w-full text-white rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-40"
            style={{ background: "#0a0a0a" }}>
            {loading ? "Submitting…" : "Submit Special Request"}
          </button>
          <button onClick={() => { setWantsSpecial(false); setStep("breakfast"); }}
            className="text-center text-xs text-gray-400 hover:text-gray-600">
            ← Go back
          </button>
        </div>
      </div>
    </div>
  );

  // ── MENU ORDERING ──
  const order = currentOrder();
  const isFirst = currentPerson === 0;
  const isLastPerson = currentPerson === totalPersons - 1;
  const showSamePrompt = !isFirst && sameAsFirst === null;

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-sm mx-auto flex flex-col gap-4 py-6">

        {/* Header */}
        <div className="text-center">
          <img src={LOGO_URL} alt="M'Kayla City ApartHotel" className="h-10 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Room {roomNumber}</p>
          {totalPersons > 1 && (
            <div className="flex justify-center gap-2 mt-2">
              {Array.from({ length: totalPersons }).map((_, i) => (
                <div key={i} className={`h-2 w-2 rounded-full ${i === currentPerson ? "bg-white" : i < currentPerson ? "bg-gray-500" : "bg-gray-700"}`} />
              ))}
            </div>
          )}
          {totalPersons > 1 && (
            <p className="text-white text-sm font-semibold mt-2">
              Guest {currentPerson + 1} of {totalPersons}
            </p>
          )}
        </div>

        {/* Same as first prompt */}
        {showSamePrompt && (
          <div className="bg-white rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-1">Guest {currentPerson + 1}</h3>
            <p className="text-gray-500 text-sm mb-5">Would you like the same breakfast as Guest 1?</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleSameAsFirst(true)}
                className="w-full border-2 border-gray-900 rounded-2xl py-3.5 text-sm font-semibold hover:bg-gray-900 hover:text-white transition-colors">
                Yes — Same as Guest 1
              </button>
              <button onClick={() => handleSameAsFirst(false)}
                className="w-full border-2 border-gray-100 rounded-2xl py-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                No — I want something different
              </button>
            </div>
          </div>
        )}

        {/* Same as first confirmed */}
        {!isFirst && sameAsFirst === true && (
          <div className="bg-white rounded-3xl p-6 shadow-2xl text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-semibold text-gray-900">Same as Guest 1</p>
            <p className="text-gray-400 text-sm mt-1">Order copied from Guest 1</p>
            <button onClick={() => {
              if (isLastPerson) handleSubmit();
              else handleNextPerson();
            }} className="mt-4 w-full text-white rounded-2xl py-3.5 text-sm font-semibold"
              style={{ background: "#0a0a0a" }}>
              {isLastPerson ? (loading ? "Submitting…" : "Submit All Orders") : `Continue to Guest ${currentPerson + 2}`}
            </button>
          </div>
        )}

        {/* Menu form */}
        {(isFirst || sameAsFirst === false) && (
          <>
            {categories.map((category) => (
              <div key={category} className="bg-white rounded-3xl p-5 shadow-xl">
                <h3 className="font-bold text-gray-900 mb-3">{category}</h3>
                <div className="flex flex-col gap-2">
                  {(menu[category] ?? []).map((item) => (
                    <label key={item}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${order[category] === item ? "border-gray-900 bg-gray-50" : "border-gray-100 hover:border-gray-200"}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${order[category] === item ? "border-gray-900 bg-gray-900" : "border-gray-300"}`}>
                        {order[category] === item && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <input type="radio" name={`${currentPerson}-${category}`} value={item}
                        checked={order[category] === item}
                        onChange={() => handleSelectItem(category, item)}
                        className="sr-only" />
                      <span className="text-sm text-gray-800">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              onClick={() => {
                if (!isCurrentComplete()) { setError("Please make a selection for every category"); return; }
                setError("");
                if (isLastPerson) handleSubmit();
                else handleNextPerson();
              }}
              disabled={loading}
              className="w-full text-white rounded-2xl py-4 text-sm font-semibold disabled:opacity-40 mb-8"
              style={{ background: "#0a0a0a" }}>
              {loading ? "Submitting…" : isLastPerson ? "Submit Breakfast Order ✓" : `Continue to Guest ${currentPerson + 2} →`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}