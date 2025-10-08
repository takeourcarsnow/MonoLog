"use client";

import { Hourglass, Clock, RefreshCw, Zap, Sparkles, Star, Camera, Check, MessageCircle, Compass, Calendar, Lock, Home } from 'lucide-react';

export const MESSAGES: string[] = [
  'Almost there',
  'Give it a moment',
  'Hold on — nearly ready',
  'One moment please',
  'Not yet — thanks for waiting',
  'Hang tight',
  'A sec...',
  'Try exploring meanwhile',
  'Soon — almost done',
  'Patience pays off',
  'Just a little longer',
  'Almost ready',
  'Thanks for waiting',
  'Back shortly',
  'Nearly there — hold on',
  'Give it a beat',
  'Sit tight',
  'Coming up soon',
  "We'll be ready shortly",
  'Hold tight — good things take time',
];

export function getWaitIcons(): JSX.Element[] {
  return [
    <Hourglass key="hg" size={18} strokeWidth={1.6} aria-hidden />,
    <Clock key="clk" size={18} strokeWidth={1.6} aria-hidden />,
    <RefreshCw key="ref" size={18} strokeWidth={1.6} aria-hidden />,
    <Zap key="zap" size={18} strokeWidth={1.6} aria-hidden />,
    <Sparkles key="spr" size={18} strokeWidth={1.6} aria-hidden />,
    <Star key="star" size={18} strokeWidth={1.6} aria-hidden />,
    <Camera key="cam" size={18} strokeWidth={1.6} aria-hidden />,
    <Check key="check" size={18} strokeWidth={1.6} aria-hidden />,
    <MessageCircle key="msg" size={18} strokeWidth={1.6} aria-hidden />,
    <Compass key="cmp" size={18} strokeWidth={1.6} aria-hidden />,
    <Calendar key="cal" size={18} strokeWidth={1.6} aria-hidden />,
    <Lock key="lock" size={18} strokeWidth={1.6} aria-hidden />,
    <Home key="home" size={18} strokeWidth={1.6} aria-hidden />,
  ];
}

export function selectTimeIcon(remainingMs: number | null): JSX.Element {
  const icons = getWaitIcons();
  if (remainingMs == null) return icons[0];
  if (remainingMs <= 60_000) return icons[1];
  if (remainingMs <= 5 * 60_000) return icons[2];
  if (remainingMs <= 30 * 60_000) return icons[1];
  return icons[3];
}
