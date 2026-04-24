import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import crypto from "crypto";

/**
 * POST /api/sms/send
 * CoolSMS(Solapi) API로 문자 발송
 *
 * Body: { recipients: [{name, phone}], message: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    // 목회자 확인
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, church_id")
      .eq("id", user.id)
      .single();

    if (!profile?.church_id) {
      return NextResponse.json({ error: "교회 소속이 필요합니다." }, { status: 403 });
    }

    // 담임목사만 문자 발송 가능
    const { data: church } = await supabase
      .from("churches")
      .select("pastor_id")
      .eq("id", profile.church_id)
      .single();

    if (church?.pastor_id !== user.id && profile.role !== "admin") {
      return NextResponse.json({ error: "담임목사만 문자를 발송할 수 있습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { recipients, message, recipientType, recipientFilter } = body as {
      recipients: { name: string; phone: string }[];
      message: string;
      recipientType?: string;
      recipientFilter?: string;
    };

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: "수신자가 없습니다." }, { status: 400 });
    }
    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
    }

    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const senderPhone = process.env.SOLAPI_SENDER;

    if (!apiKey || !apiSecret || !senderPhone) {
      return NextResponse.json({ error: "SMS 설정이 완료되지 않았습니다." }, { status: 500 });
    }

    // 메시지 타입 자동 판별 (한글 기준 80byte = 약 40자)
    const byteLength = Buffer.byteLength(message, "utf8");
    const msgType = byteLength <= 90 ? "SMS" : "LMS";

    // Solapi 인증 헤더 생성 (HMAC-SHA256)
    const date = new Date().toISOString();
    const salt = crypto.randomBytes(32).toString("hex");
    const signature = crypto
      .createHmac("sha256", apiSecret)
      .update(date + salt)
      .digest("hex");

    // 메시지 배열 생성
    const messages = recipients
      .filter((r) => r.phone)
      .map((r) => ({
        to: r.phone.replace(/-/g, ""),
        from: senderPhone.replace(/-/g, ""),
        text: message,
        type: msgType,
      }));

    if (messages.length === 0) {
      return NextResponse.json({ error: "유효한 전화번호가 없습니다." }, { status: 400 });
    }

    // Solapi API 호출
    const solapiRes = await fetch("https://api.solapi.com/messages/v4/send-many", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
      },
      body: JSON.stringify({ messages }),
    });

    const solapiData = await solapiRes.json();

    const status = solapiRes.ok ? "sent" : "failed";

    // DB에 발송 기록 저장
    await supabase.from("sms_messages").insert({
      church_id: profile.church_id,
      sender_id: user.id,
      recipient_type: recipientType || "individual",
      recipient_filter: recipientFilter || null,
      recipients: recipients.map((r) => ({ name: r.name, phone: r.phone })),
      recipient_count: messages.length,
      message,
      msg_type: msgType,
      status,
      api_response: solapiData,
    });

    if (!solapiRes.ok) {
      return NextResponse.json({
        error: solapiData.errorMessage || "문자 발송에 실패했습니다.",
        details: solapiData,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      sent: messages.length,
      msgType,
      groupId: solapiData.groupId,
    });
  } catch (error) {
    console.error("SMS send error:", error);
    return NextResponse.json({ error: "문자 발송 중 오류가 발생했습니다." }, { status: 500 });
  }
}
