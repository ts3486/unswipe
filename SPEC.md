# SPEC.md — Unmatch App Specification

This document tracks feature-level requirements, screen specs, and implementation status. Updated at the start of each implementation cycle.

## Screens

### /onboarding
- TODO

### /(tabs)/home
- TODO

### /(tabs)/panic
- TODO

### /(tabs)/progress
- TODO

### /(tabs)/learn
- TODO

### /(tabs)/settings
- TODO

### /paywall
- TODO

### /settings/blocker-guide
- TODO

### /settings/privacy
- TODO

### /progress/day/[date]
- TODO

## Domain Rules
- Resist Rank: starts 1, +1 per 5 resists, never decreases, cap 30
- Day boundary: device local timezone midnight
- Day success: panic_success_count >= 1 OR daily_task_completed
- Once success that day, later fails don't remove it
- Urge kinds: swipe, check, spend
- Spend categories: iap, date, gift, tipping, transport, other

## Data
- Seed: `data/seed/catalog.json` (triggers, actions, spend delay cards)
- Seed: `data/seed/starter_7d.json` (7-day course)
- Storage: expo-sqlite, local only, no backend

## Services
- Lock/screen time guidance (no forced lockouts)
- Local notifications
- Analytics (no free-text, no spend_amount, no notes)
- Subscription/paywall (IAP)

## Changelog
<!-- Append entries here as specs evolve -->
