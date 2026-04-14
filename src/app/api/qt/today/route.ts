import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("daily_qt")
      .select("*")
      .eq("qt_date", today)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "오늘의 큐티가 아직 준비되지 않았습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("QT fetch error:", error);
    return NextResponse.json(
      { error: "큐티를 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
