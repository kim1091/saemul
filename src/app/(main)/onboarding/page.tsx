"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Step = 1 | 2 | 3 | 4 | 5;
type UserType = "pastor" | "member";

const RANKS_PASTOR = ["담임목사", "부목사", "전도사", "목사"];
const RANKS_MEMBER = ["장로", "권사", "안수집사", "서리집사", "세례교인", "원입교인", "성도"];
const SERVICES = [
  "구역장", "구역 인도자", "교구장",
  "유아부 교사", "아동부 교사", "청소년부 교사", "청년부 교사",
  "찬양대", "성가대", "반주자",
  "청년부 리더", "안내위원", "차량봉사", "식당봉사",
  "주방봉사", "미디어봉사", "새신자부", "중보기도팀",
];
const GENDERS = [{ value: "male", label: "남성" }, { value: "female", label: "여성" }];
const MARITAL = [
  { value: "single", label: "미혼" },
  { value: "married", label: "기혼" },
  { value: "widowed", label: "사별" },
  { value: "divorced", label: "이혼" },
];
const RELATIONS = ["배우자", "자녀", "부모", "형제/자매", "기타"];

interface Family { relation: string; name: string; birth_date: string }

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Step 1: 역할
  const [userType, setUserType] = useState<UserType | "">("");

  // Step 2: 교회
  const [churchSearch, setChurchSearch] = useState("");
  const [churches, setChurches] = useState<{id:string;name:string;address:string|null}[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState("");
  const [selectedChurchName, setSelectedChurchName] = useState("");
  // 목사일 경우
  const [newChurchName, setNewChurchName] = useState("");
  const [newChurchAddress, setNewChurchAddress] = useState("");
  const [newChurchPhone, setNewChurchPhone] = useState("");

  // Step 3: 개인 정보
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [marital, setMarital] = useState("");

  // Step 4: 직분 + 봉사 + 세례
  const [rank, setRank] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [baptismDate, setBaptismDate] = useState("");
  const [registrationDate, setRegistrationDate] = useState("");
  const [district, setDistrict] = useState("");

  // Step 5: 가족
  const [family, setFamily] = useState<Family[]>([]);

  useEffect(() => {
    loadExisting();
  }, []);

  async function loadExisting() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data?.onboarded) {
      router.push("/home");
      return;
    }
    if (data?.name) setName(data.name);
    if (data?.phone) setPhone(data.phone);
  }

  async function searchChurches() {
    if (churchSearch.trim().length < 2) return;
    const { data } = await supabase.from("churches").select("id, name, address").ilike("name", `%${churchSearch.trim()}%`).limit(20);
    setChurches(data || []);
  }

  function toggleService(s: string) {
    setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function addFamily() {
    setFamily([...family, { relation: "자녀", name: "", birth_date: "" }]);
  }

  function updateFamily(i: number, field: keyof Family, value: string) {
    setFamily(family.map((f, idx) => idx === i ? { ...f, [field]: value } : f));
  }

  function removeFamily(i: number) {
    setFamily(family.filter((_, idx) => idx !== i));
  }

  function canProceed(): boolean {
    if (step === 1) return !!userType;
    if (step === 2) {
      if (userType === "pastor") return newChurchName.trim().length >= 2;
      return !!selectedChurchId;
    }
    if (step === 3) return name.trim().length >= 1 && !!birthDate && !!gender;
    if (step === 4) return !!rank;
    return true;
  }

  async function handleFinish() {
    setLoading(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const profilePayload: Record<string, unknown> = {
      name, phone: phone || null, birth_date: birthDate || null, gender: gender || null,
      address: address || null, marital_status: marital || null,
      rank: rank || null, services: services.length > 0 ? services : null,
      baptism_date: baptismDate || null,
      registration_date: registrationDate || null,
      district: district || null,
      family: family.length > 0 ? family : null,
      onboarded: true,
    };

    if (userType === "pastor") {
      // 교회 생성
      const { data: church, error: chErr } = await supabase.from("churches").insert({
        name: newChurchName,
        address: newChurchAddress || null,
        phone: newChurchPhone || null,
        pastor_id: user.id,
      }).select().single();

      if (chErr) { setMessage("교회 등록 실패: " + chErr.message); setLoading(false); return; }

      profilePayload.role = "pastor";
      profilePayload.church_id = church.id;
      profilePayload.church_name = church.name;

      // 기본 예배 5개
      const defaults = [
        { name: "주일 1부", day_of_week: 0, time: "09:00" },
        { name: "주일 2부", day_of_week: 0, time: "11:00" },
        { name: "수요예배", day_of_week: 3, time: "19:30" },
        { name: "금요기도", day_of_week: 5, time: "21:00" },
        { name: "새벽기도", day_of_week: 1, time: "05:30" },
      ];
      for (const w of defaults) {
        await supabase.from("worship_types").insert({ ...w, church_id: church.id });
      }

      await supabase.from("profiles").update(profilePayload).eq("id", user.id);
      router.push("/admin");
    } else {
      // 성도 — 가입 신청
      await supabase.from("profiles").update(profilePayload).eq("id", user.id);

      const snapshot = { name, phone, rank, services, baptism_date: baptismDate, registration_date: registrationDate };

      const { error: jrErr } = await supabase.from("join_requests").insert({
        church_id: selectedChurchId,
        user_id: user.id,
        status: "pending",
        snapshot,
      });

      if (jrErr?.code === "23505") {
        setMessage(`이미 "${selectedChurchName}"에 가입 요청을 보냈습니다.`);
      } else if (jrErr) {
        setMessage("신청 실패: " + jrErr.message);
        setLoading(false);
        return;
      } else {
        setMessage(`"${selectedChurchName}"에 가입 신청 완료! 목사님 승인을 기다려주세요.`);
      }

      setTimeout(() => router.push("/home"), 2000);
    }
    setLoading(false);
  }

  return (
    <div className="px-5 pt-6 pb-8">
      {/* 진행 표시 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-green-dark">샘물 시작하기</h1>
        <span className="text-xs text-mid-gray">{step} / 5</span>
      </div>
      <div className="flex gap-1 mb-6">
        {[1,2,3,4,5].map(s => (
          <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? "bg-green" : "bg-light-gray"}`} />
        ))}
      </div>

      {/* Step 1: 역할 */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-bold text-charcoal mb-2">환영합니다! 🙏</h2>
          <p className="text-mid-gray text-sm mb-6">어떤 역할로 시작하시겠어요?</p>

          <button
            onClick={() => setUserType("member")}
            className={`w-full p-5 rounded-2xl border-2 mb-3 text-left transition ${userType === "member" ? "border-green bg-green/5" : "border-light-gray bg-white"}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🙋</span>
              <div>
                <p className="font-bold text-charcoal">성도</p>
                <p className="text-xs text-mid-gray mt-0.5">교회에 가입하고 묵상/소그룹에 참여</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setUserType("pastor")}
            className={`w-full p-5 rounded-2xl border-2 text-left transition ${userType === "pastor" ? "border-green bg-green/5" : "border-light-gray bg-white"}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">✝️</span>
              <div>
                <p className="font-bold text-charcoal">목회자</p>
                <p className="text-xs text-mid-gray mt-0.5">교회를 등록하고 성도/재정/출석 관리</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Step 2: 교회 */}
      {step === 2 && userType === "member" && (
        <div>
          <h2 className="text-lg font-bold text-charcoal mb-2">소속 교회 찾기</h2>
          <p className="text-mid-gray text-sm mb-4">교회 이름을 검색하세요</p>

          <div className="flex gap-2 mb-4">
            <input
              type="text" value={churchSearch}
              onChange={(e) => setChurchSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchChurches()}
              placeholder="교회 이름 검색"
              className="flex-1 px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
            />
            <button onClick={searchChurches} className="px-4 py-2.5 bg-green text-white rounded-lg text-sm font-medium">검색</button>
          </div>

          <div className="space-y-2">
            {churches.map((c) => (
              <button key={c.id}
                onClick={() => { setSelectedChurchId(c.id); setSelectedChurchName(c.name); }}
                className={`w-full text-left p-3 rounded-xl border ${selectedChurchId === c.id ? "border-green bg-green/5" : "border-light-gray bg-white"}`}
              >
                <p className="font-bold text-charcoal text-sm">{c.name}</p>
                {c.address && <p className="text-xs text-mid-gray mt-0.5">{c.address}</p>}
              </button>
            ))}
          </div>

          {selectedChurchId && (
            <div className="bg-green/5 rounded-xl p-3 mt-4">
              <p className="text-sm text-charcoal">
                <span className="text-green font-bold">{selectedChurchName}</span> 선택됨
              </p>
            </div>
          )}
        </div>
      )}

      {step === 2 && userType === "pastor" && (
        <div>
          <h2 className="text-lg font-bold text-charcoal mb-2">교회 등록</h2>
          <p className="text-mid-gray text-sm mb-4">담당하시는 교회 정보를 입력해주세요</p>

          <div className="space-y-3">
            <input type="text" placeholder="교회 이름 *"
              value={newChurchName}
              onChange={(e) => setNewChurchName(e.target.value)}
              className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            <input type="text" placeholder="주소"
              value={newChurchAddress}
              onChange={(e) => setNewChurchAddress(e.target.value)}
              className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            <input type="tel" placeholder="전화번호"
              value={newChurchPhone}
              onChange={(e) => setNewChurchPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          </div>

          <p className="text-xs text-mid-gray mt-3">완료 시 자동으로 기본 예배 5개(주일1/2부, 수요, 금요, 새벽)가 생성됩니다.</p>
        </div>
      )}

      {/* Step 3: 개인 정보 */}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-bold text-charcoal mb-2">개인 정보</h2>
          <p className="text-mid-gray text-sm mb-4">본인 정보를 입력해주세요</p>

          <div className="space-y-3">
            <input type="text" placeholder="이름 *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            <input type="tel" placeholder="전화번호"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />

            <div>
              <label className="text-xs text-mid-gray block mb-1">생년월일 *</label>
              <input type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            </div>

            <div>
              <label className="text-xs text-mid-gray block mb-1">성별 *</label>
              <div className="flex gap-2">
                {GENDERS.map(g => (
                  <button key={g.value}
                    onClick={() => setGender(g.value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${gender === g.value ? "bg-green text-white border-green" : "bg-white text-charcoal border-light-gray"}`}
                  >{g.label}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-mid-gray block mb-1">결혼 여부</label>
              <div className="grid grid-cols-4 gap-2">
                {MARITAL.map(m => (
                  <button key={m.value}
                    onClick={() => setMarital(m.value)}
                    className={`py-2 rounded-lg text-xs font-medium border ${marital === m.value ? "bg-green text-white border-green" : "bg-white text-charcoal border-light-gray"}`}
                  >{m.label}</button>
                ))}
              </div>
            </div>

            <input type="text" placeholder="주소"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          </div>
        </div>
      )}

      {/* Step 4: 직분 + 봉사 + 세례 */}
      {step === 4 && (
        <div>
          <h2 className="text-lg font-bold text-charcoal mb-2">교회 정보</h2>
          <p className="text-mid-gray text-sm mb-4">직분과 봉사를 선택하세요</p>

          <div className="mb-5">
            <label className="text-sm font-bold text-charcoal block mb-2">직분 *</label>
            <div className="grid grid-cols-3 gap-2">
              {(userType === "pastor" ? RANKS_PASTOR : RANKS_MEMBER).map(r => (
                <button key={r}
                  onClick={() => setRank(r)}
                  className={`py-2 rounded-lg text-sm font-medium border ${rank === r ? "bg-green text-white border-green" : "bg-white text-charcoal border-light-gray"}`}
                >{r}</button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-sm font-bold text-charcoal block mb-2">봉사 (여러 개 선택)</label>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map(s => (
                <button key={s}
                  onClick={() => toggleService(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${services.includes(s) ? "bg-gold text-charcoal border-gold" : "bg-white text-charcoal border-light-gray"}`}
                >{services.includes(s) ? "✓ " : ""}{s}</button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-mid-gray block mb-1">세례 일자</label>
              <input type="date" value={baptismDate}
                onChange={(e) => setBaptismDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            </div>
            <div>
              <label className="text-xs text-mid-gray block mb-1">교회 등록일 / 원입 일자</label>
              <input type="date" value={registrationDate}
                onChange={(e) => setRegistrationDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            </div>
            <input type="text" placeholder="소속 구역 (예: 1구역)" value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          </div>
        </div>
      )}

      {/* Step 5: 가족 */}
      {step === 5 && (
        <div>
          <h2 className="text-lg font-bold text-charcoal mb-2">가족 사항</h2>
          <p className="text-mid-gray text-sm mb-4">가족 정보는 선택 입력입니다</p>

          {family.map((f, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm mb-3 space-y-2">
              <div className="flex gap-2">
                <select value={f.relation}
                  onChange={(e) => updateFamily(i, "relation", e.target.value)}
                  className="px-3 py-2 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
                >
                  {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input type="text" placeholder="이름"
                  value={f.name}
                  onChange={(e) => updateFamily(i, "name", e.target.value)}
                  className="flex-1 px-4 py-2 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
                <button onClick={() => removeFamily(i)} className="text-xs text-mid-gray px-2">삭제</button>
              </div>
              <input type="date" value={f.birth_date}
                onChange={(e) => updateFamily(i, "birth_date", e.target.value)}
                className="w-full px-4 py-2 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            </div>
          ))}

          <button onClick={addFamily}
            className="w-full py-2.5 bg-white border-2 border-dashed border-light-gray rounded-xl text-sm text-mid-gray"
          >
            + 가족 추가
          </button>

          <div className="bg-gold/10 rounded-xl p-4 mt-6">
            <p className="text-sm text-charcoal">
              {userType === "pastor"
                ? "✓ 완료하면 교회가 등록되고 관리 대시보드로 이동합니다."
                : `✓ 완료하면 "${selectedChurchName}"에 가입 신청이 전송됩니다.`}
            </p>
          </div>
        </div>
      )}

      {message && (
        <p className={`text-sm text-center mt-4 p-3 rounded-lg ${message.includes("완료") || message.includes("신청") ? "bg-green/10 text-green-dark" : "bg-gold/10 text-gold"}`}>
          {message}
        </p>
      )}

      {/* 하단 버튼 */}
      <div className="flex gap-2 mt-6">
        {step > 1 && (
          <button onClick={() => setStep((step - 1) as Step)}
            className="flex-1 py-3 bg-white border border-light-gray rounded-xl text-sm font-medium"
          >← 이전</button>
        )}
        {step < 5 && (
          <button onClick={() => canProceed() && setStep((step + 1) as Step)}
            disabled={!canProceed()}
            className="flex-1 py-3 bg-green text-white rounded-xl text-sm font-bold disabled:opacity-40"
          >다음 →</button>
        )}
        {step === 5 && (
          <button onClick={handleFinish} disabled={loading}
            className="flex-1 py-3 bg-green text-white rounded-xl text-sm font-bold disabled:opacity-40"
          >{loading ? "처리 중..." : "완료 🙌"}</button>
        )}
      </div>
    </div>
  );
}
