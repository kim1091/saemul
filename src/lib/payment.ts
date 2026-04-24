/**
 * 결제 관련 상수 및 유틸리티
 */

import type { SubscriptionTier } from "./types";

export interface PlanInfo {
  tier: SubscriptionTier;
  label: string;
  price: number;       // 월 가격 (원)
  description: string;
  features: string[];
}

export const PAID_PLANS: PlanInfo[] = [
  {
    tier: "premium",
    label: "Premium",
    price: 4_900,
    description: "성도를 위한 AI 성경 도우미",
    features: [
      "5분 설교 월 4회",
      "AI 질문 월 30회",
      "소그룹 생성",
    ],
  },
  {
    tier: "premium_plus",
    label: "Premium+",
    price: 9_900,
    description: "더 깊은 성경 공부",
    features: [
      "5분 설교 월 10회",
      "AI 질문 무제한",
      "Big Idea 분석 월 10회",
    ],
  },
  {
    tier: "pastor",
    label: "Pastor",
    price: 19_900,
    description: "부목사·전도사를 위한 설교공방",
    features: [
      "설교공방 무제한",
      "AI 질문 무제한",
      "Big Idea·설교 분석 무제한",
    ],
  },
  {
    tier: "church",
    label: "Church",
    price: 99_000,
    description: "교회 통합 관리 플랫폼",
    features: [
      "담임목사 설교공방 무제한",
      "교회 관리 (출석·심방·재정)",
      "다수 관리자 지정",
      "PDF 보고서",
    ],
  },
];

/** tier로 요금 정보 조회 */
export function getPlanByTier(tier: string): PlanInfo | undefined {
  return PAID_PLANS.find((p) => p.tier === tier);
}

/** 주문번호 생성: saemul_yyyyMMddHHmmss_랜덤8자 */
export function generateOrderId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 10);
  return `saemul_${ts}_${rand}`;
}
