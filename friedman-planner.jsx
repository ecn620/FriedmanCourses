import React, { useState, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRightLeft, CheckCircle2, Circle, Clock, EyeOff, Eye, FolderOpen, Info, Lock,
  Mail, Plus, Save, Search, AlertTriangle, Users, X, Star, GraduationCap,
} from "lucide-react";

/* ============================================================================
   FRIEDMAN MS DEGREE PLANNER  (source for app.js)
   ----------------------------------------------------------------------------
   Build:  npx esbuild friedman-planner.jsx --bundle --minify --format=iife \
             --jsx=automatic --define:process.env.NODE_ENV=\"production\" --outfile=app.js
   ADVISOR settings:
   1) ADVISOR_EMAIL    – where the "email my plan" button sends to.
   2) ADVISOR_PASSCODE – the code for the advisor view (must match ADVISOR_KEY
                         in friedman-plan-server.gs).
   3) Shared plan server URL lives in index.html (window.FRIEDMAN_SYNC_URL).
   Course data: AY2026-27 offerings spreadsheet is the source of truth.
   Prerequisites: nutrition.tufts.edu/student-experience/registrar/prerequisites
   This is a planning aid, not an official degree audit.
   ========================================================================== */

const ADVISOR_EMAIL = "erin.coughlan@tufts.edu";
const ADVISOR_PASSCODE = "friedman-advisor";
const SYNC_URL = (typeof window !== "undefined" && window.FRIEDMAN_SYNC_URL) || "";
const EL_HOURS = 120;

/* ---------- theme (palette sampled from the MS viewbook) ---------- */
const t = {
  navy: "#3172ac", navyDeep: "#255a8a", blue: "#3172ac", blueBright: "#408ed6",
  green: "#00833d", greenDeep: "#046a33", ink: "#16334f", slate: "#5b6b80", faint: "#8a97a8",
  paper: "#f4f2ec", card: "#ffffff", line: "#dfe3ea", lineSoft: "#eceef2", brass: "#b07b2c",
  met: "#00833d", metBg: "#e4f3ea", attn: "#b06a12", attnBg: "#fbf0dd", bad: "#b0402f", badBg: "#f8e7e3",
  serif: "Georgia, 'Times New Roman', ui-serif, serif",
  sans: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

/* ---------- course families ---------- */
function familyOf(code) {
  const c = code.toUpperCase();
  if (c.startsWith("NUTR ON") || c.startsWith("NUTRON")) return "ON";
  if (c.startsWith("NUTB")) return "B";
  if (c.startsWith("NUTC")) return "C";
  if (c.startsWith("NUTR")) return "R";
  return "X";
}
const familyColor = { R: "#3172ac", ON: "#408ed6", B: "#00833d", C: "#4f9a5f", X: "#8a6d1f" };

/* ---------- specializations ---------- */
const ONLINE_SPECS = ["Nutrition Science and Policy", "Climate, Sustainability, and Food", "Data Analytics and AI in Nutrition", "Humanitarian Assistance", "Build Your Own"];
const CAMPUS_SPECS = [
  "Agriculture, Food, and Environment", "Biochemical and Molecular Nutrition", "Climate, Sustainability, and Food",
  "Community Interventions and Behavior Change", "Data Analytics and AI in Nutrition", "Food Policy, Programs, and Economics",
  "Food Systems Modeling", "Humanitarian Assistance", "Nutrition Communication",
  "Nutrition, Diet and Disease Across the Lifecycle", "Nutrition Entrepreneurship and Innovation", "Nutrition Equity",
  "Nutritional Epidemiology and Public Health Nutrition", "Build Your Own",
];
const ALL_SPECS = Array.from(new Set([...CAMPUS_SPECS, ...ONLINE_SPECS]));

/* meetings: { Fall:[{d:['Mon','Wed'],s:'13:30',e:'15:00'}] }  (none => async/TBA, never conflicts) */
function C(code, title, cr, terms, opts = {}) {
  return {
    code, title, cr, terms, fam: familyOf(code),
    fulfills: opts.fulfills || [], meetings: opts.meetings || {},
    note: opts.note || "", directed: !!opts.directed,
  };
}

/* ============================================================================
   COURSE DATA  (advisor-editable)
   ========================================================================== */
const CATALOG = [
  C("NUTC 202", "Principles of Nutrition Science", 3, ["Fall","Spring","Summer"], {fulfills: ["nutsci"],note: "Fully asynchronous online"}),
  C("NUTR 202", "Principles of Nutrition Science", 3, ["Fall","Summer"], {fulfills: ["nutsci"],meetings: {Fall: [{d: ["Tue","Fri"],s: "13:30",e: "15:00"}]}}),
  C("NUTR 245", "Scientific Basis of Nutrition: Micronutrients", 3, ["Fall"], {fulfills: ["nutsci"],meetings: {Fall: [{d: ["Fri"],s: "09:00",e: "12:00"}]}}),
  C("NUTR 246", "Scientific Basis of Nutrition: Macronutrients", 3, ["Spring"], {fulfills: ["nutsci"],meetings: {Spring: [{d: ["Fri"],s: "09:00",e: "12:00"}]}}),
  C("NUTR 370", "Nutritional Biochemistry & Physiology: Macronutrients", 3, ["Fall"], {fulfills: ["nutsci"],meetings: {Fall: [{d: ["Tue"],s: "09:00",e: "12:00"}]}}),
  C("NUTR 371", "Nutritional Biochemistry & Physiology: Micronutrients", 3, ["Spring"], {fulfills: ["nutsci"],meetings: {Spring: [{d: ["Tue"],s: "13:00",e: "16:00"}]}}),
  C("NUTB 250", "Statistical Methods for Health Professionals I", 3, ["Fall","Summer"], {fulfills: ["quant"]}),
  C("NUTB 350", "Statistical Methods for Health Professionals II", 3, ["Spring"]),
  C("NUTR 206", "Biostatistics I", 3, ["Fall"], {fulfills: ["quant"],meetings: {Fall: [{d: ["Mon","Wed"],s: "14:30",e: "16:30"}]}}),
  C("NUTR 207", "Statistical Methods for Nutrition Science and Policy", 3, ["Fall"], {fulfills: ["quant"],meetings: {Fall: [{d: ["Mon","Wed"],s: "13:30",e: "15:00"}]}}),
  C("NUTR 307", "Regression Analysis for Nutrition Science and Policy", 3, ["Spring"], {meetings: {Spring: [{d: ["Mon","Wed"],s: "13:30",e: "15:00"}]}}),
  C("NUTR 309", "Biostatistics II", 3, ["Spring"], {meetings: {Spring: [{d: ["Mon","Wed"],s: "13:30",e: "15:00"}]}}),
  C("NUTR 237", "Data Management Using SAS", 3, ["Fall"], {meetings: {Fall: [{d: ["Thu"],s: "15:00",e: "18:00"}]}}),
  C("NUTR ON237", "Data Management Using SAS", 3, ["Summer"]),
  C("NUTR 394", "Advanced Data Analysis", 3, ["Fall"], {meetings: {Fall: [{d: ["Mon"],s: "15:30",e: "17:30"},{d: ["Wed"],s: "17:00",e: "18:00"}]}}),
  C("NUTR ON390", "Introduction to AI-Based Applications for Nutrition & Health Research", 3, ["Fall"]),
  C("NUTR 393", "Data Visualization & Effective Communication", 3, ["Spring"], {meetings: {Spring: [{d: ["Mon"],s: "15:30",e: "17:30"},{d: ["Wed"],s: "15:30",e: "16:30"}]}}),
  C("NUTR ON393", "Data Visualization and Effective Communication", 3, ["Spring"]),
  C("NUTR 231", "Fundamentals of Geographic Information Systems (GIS)", 3, ["Fall"]),
  C("NUTR 348", "Biomedical Data Science", 1.5, ["Spring"], {meetings: {Spring: [{d: ["Wed"],s: "14:00",e: "17:00"}]}}),
  C("NUTR 203", "Fundamentals of Nutrition Policy & Programming", 3, ["Fall"], {fulfills: ["policy"],meetings: {Fall: [{d: ["Mon"],s: "10:30",e: "12:00"},{d: ["Thu"],s: "13:30",e: "15:00"}]},note: "Hybrid; all-online students via Zoom"}),
  C("NUTB 206", "Global Food and Nutrition Policy", 3, ["Summer"], {fulfills: ["policy"]}),
  C("NUTR 238", "Economics of Food, Agriculture and Nutrition", 3, ["Fall"], {fulfills: ["policy"],meetings: {Fall: [{d: ["Tue","Thu"],s: "08:30",e: "10:00"}]}}),
  C("NUTB 238", "Economics of Food, Agriculture and Nutrition", 3, ["Spring"], {fulfills: ["policy"]}),
  C("NUTB 227", "Global Nutrition Programs", 3, ["Spring"], {fulfills: ["policy"]}),
  C("NUTR ON234", "Climate, Agriculture, and Food Policy", 3, ["Spring"], {fulfills: ["policy"]}),
  C("NUTR 215", "Fundamentals of U.S. Agriculture", 3, ["Fall"], {fulfills: ["policy"],meetings: {Fall: [{d: ["Wed"],s: "09:00",e: "12:00"}]}}),
  C("NUTR ON222", "Gender & Intersectional Analysis in Humanitarian Assistance", 1.5, ["Fall"], {fulfills: ["policy"],note: "Fulfills policy when paired with NUTR ON223"}),
  C("NUTR ON223", "Protection in Humanitarian Assistance", 1.5, ["Fall"], {fulfills: ["policy"],note: "Fulfills policy when paired with NUTR ON222"}),
  C("NUTR 204", "Principles of Epidemiology", 3, ["Fall","Spring"], {meetings: {Fall: [{d: ["Tue"],s: "09:00",e: "12:00"}],Spring: [{d: ["Thu"],s: "13:00",e: "16:00"}]}}),
  C("NUTR 211", "Theories of Behavior Change and Their Application in Nutrition and Public Health Interventions", 3, ["Fall"], {meetings: {Fall: [{d: ["Wed"],s: "09:00",e: "12:00"}]}}),
  C("NUTB 211", "Theories of Behavior Change", 3, ["Summer"]),
  C("NUTC 211", "Theories of Behavior Change and Their Application in Nutrition and Public Health Interventions", 3, ["Spring"]),
  C("NUTR 217", "Monitoring & Evaluation of Nutrition & Food Security Projects", 3, ["Spring"], {meetings: {Spring: [{d: ["Wed"],s: "15:15",e: "18:15"}]}}),
  C("NUTR 228", "Community and Public Health Nutrition", 3, ["Fall"], {meetings: {Fall: [{d: ["Mon"],s: "10:00",e: "13:00"}]}}),
  C("NUTR 210", "Survey Research in Nutrition", 3, ["Spring"], {meetings: {Spring: [{d: ["Mon"],s: "09:00",e: "12:00"}]}}),
  C("NUTR 218", "Communications Strategies in Nutrition & Health Promotion", 3, ["Spring"], {meetings: {Spring: [{d: ["Thu"],s: "09:00",e: "12:00"}]}}),
  C("NUTR 213", "Social Media for Health and Nutrition Communication", 1.5, ["Fall"]),
  C("NUTR 306", "Communicating Health Information to Diverse Audiences", 3, ["Fall"]),
  C("NUTR 322", "Writing Well About Food and Nutrition", 3, ["Fall"], {meetings: {Fall: [{d: ["Tue"],s: "13:30",e: "16:30"}]},note: "Fully synchronous online"}),
  C("NUTR 227", "International Nutrition Programs", 3, ["Fall"], {meetings: {Fall: [{d: ["Wed"],s: "15:55",e: "18:15"}]}}),
  C("NUTR 229", "Humanitarian Action in Complex Emergencies", 3, ["Fall"]),
  C("NUTR 308", "Nutrition in Emergencies: Policies, Practice and Decision-Making", 3, ["Spring"], {meetings: {Spring: [{d: ["Mon"],s: "15:15",e: "18:15"}]}}),
  C("NUTR 222", "Gender, Culture & Conflict in Complex Humanitarian Emergencies", 3, ["Fall"], {meetings: {Fall: [{d: ["Fri"],s: "12:00",e: "14:20"}]}}),
  C("NUTR 243", "Forced Migration", 3, ["Fall"], {meetings: {Fall: [{d: ["Thu"],s: "15:00",e: "17:20"}]}}),
  C("NUTR 324", "International Humanitarian Response", 3, ["Spring"], {meetings: {Spring: [{d: ["Wed"],s: "18:00",e: "20:00"}]}}),
  C("NUTR ON229", "Humanitarian Action: Past, Present, Future", 3, ["Spring"]),
  C("NUTR ON339", "Livelihoods, Food Security and Nutrition", 1.5, ["Spring"]),
  C("NUTR ON340", "Famine, Severe Food Insecurity and Mass Starvation", 1.5, ["Spring"]),
  C("NUTR 233", "Agricultural Science and Policy I", 3, ["Spring"]),
  C("NUTR 333", "Agricultural Science and Policy II", 3, ["Fall"], {meetings: {Fall: [{d: ["Tue","Thu"],s: "10:30",e: "12:00"}]}}),
  C("NUTR 341", "Environmental Economics of Food and Agriculture", 3, ["Spring"], {meetings: {Spring: [{d: ["Tue","Thu"],s: "13:30",e: "15:00"}]}}),
  C("NUTR 331", "Environmental Lifecycle Assessment", 3, ["Spring"], {meetings: {Spring: [{d: ["Wed"],s: "09:00",e: "12:00"}]}}),
  C("NUTR 342", "Food Systems Modeling and Analysis", 3, ["Spring"], {meetings: {Spring: [{d: ["Tue","Thu"],s: "09:00",e: "10:25"}]}}),
  C("NUTR 346", "Simulating Biophysical Processes", 3, ["Fall"]),
  C("NUTR 256", "Climate Change: Risk and Adaptation for Food Systems", 3, ["Fall"], {meetings: {Fall: [{d: ["Mon"],s: "09:00",e: "12:00"}]}}),
  C("NUTR ON256", "Climate Change: Risk and Adaptation for Food Systems and Beyond", 3, ["Fall"]),
  C("NUTR 278", "Corporate Social Responsibility in the Food Industry", 3, ["Spring"], {meetings: {Spring: [{d: ["Mon"],s: "09:30",e: "12:30"}]}}),
  C("NUTR 285", "Food Justice: Critical Approaches in Policy and Planning", 3, ["Fall"], {meetings: {Fall: [{d: ["Wed"],s: "13:30",e: "16:00"}]}}),
  C("NUTR 303", "Determinants of U.S. Food Policy", 3, ["Fall"], {meetings: {Fall: [{d: ["Tue","Thu"],s: "08:45",e: "10:15"}]}}),
  C("NUTR 304", "Global Food and Nutrition Policy", 3, ["Fall"], {meetings: {Fall: [{d: ["Tue"],s: "14:00",e: "17:00"}]}}),
  C("NUTR 305", "Nutritional Epidemiology", 3, ["Fall"], {meetings: {Fall: [{d: ["Tue"],s: "10:30",e: "12:00"},{d: ["Wed"],s: "13:30",e: "15:00"}]}}),
  C("NUTR 319", "Intermediate Epidemiology", 3, ["Spring"], {meetings: {Spring: [{d: ["Thu"],s: "09:00",e: "12:00"}]}}),
  C("NUTR 280", "Nutrition & Entrepreneurship: Idea to Impact", 3, ["Fall"], {meetings: {Fall: [{d: ["Wed"],s: "16:30",e: "19:30"}]}}),
  C("NUTR 284", "Food Law and Regulation", 3, ["Spring"]),
  C("NUTR 272", "Nutrition, Physical Activity and Health", 3, ["Spring"], {meetings: {Spring: [{d: ["Fri"],s: "08:30",e: "11:30"}]}}),
  C("NUTR 301", "Nutrition in the Lifecycle", 1.5, ["Spring"], {meetings: {Spring: [{d: ["Tue"],s: "16:00",e: "18:00"}]}}),
  C("NUTR 312", "Nutrition and Chronic Disease", 1.5, ["Spring"], {meetings: {Spring: [{d: ["Tue"],s: "09:00",e: "12:00"}]}}),
  C("NUTR 315", "Applied Nutritional Biochemistry", 3, ["Fall"], {meetings: {Fall: [{d: ["Thu"],s: "09:00",e: "12:00"}]}}),
  C("NUTR 248", "Precision Nutrition", 3, ["Spring"], {meetings: {Spring: [{d: ["Mon"],s: "15:15",e: "18:15"}]}}),
  C("NUTR 240", "Nutrition Science Journal Club", 0, ["Spring"], {meetings: {Spring: [{d: ["Wed"],s: "10:30",e: "12:00"}]}}),
  C("NUTR 225", "Introduction to Modern Biology Techniques", 1.5, ["Fall"], {meetings: {Fall: [{d: ["Tue"],s: "13:30",e: "15:00"}]}}),
  C("NUTR 236", "Practicum in Bioresearch Techniques", 3, ["Fall","Spring"]),
  C("NUTR 330", "Anthropology of Food and Nutrition", 3, ["Spring"], {note: "Offered alternating springs"}),
  C("NUTR 310", "Qualitative Research Methods for Nutrition", 3, ["Spring"], {meetings: {Spring: [{d: ["Wed"],s: "09:00",e: "12:00"}]},note: "Fully synchronous online"}),
  C("NUTR 274", "Ethics and Community-Engaged Research", 3, ["Spring"]),
  C("NUTR 375", "Applied Genetic Epidemiology & Biostatistics in Nutrition Research", 3, ["Spring"], {meetings: {Spring: [{d: ["Mon"],s: "09:00",e: "12:00"}]}}),
  C("BCHM 223", "Graduate Biochemistry", 6, ["Fall"], {note: "Cross-listed"}),
  C("NUTR 397", "Directed Study", 3, ["Fall","Spring","Summer"], {note: "Credits vary",directed: true}),
  C("NUTB 219", "Food Science Fundamentals", 1.5, ["Fall"]),
  C("NUTB 243", "Nutrition, Brain, and Behavior", 1.5, ["Fall"]),
  C("NUTB 204", "Epidemiology for Nutrition Professionals", 3, ["Spring"]),
  C("NUTB 316", "Advanced Medical Nutrition Therapy", 3, ["Summer"]),
  C("NUTB 300", "Master's Thesis", 3, ["Summer"]),
  C("NUTC 261", "Sustainability on the Farm", 3, ["Fall"], {note: "AFE students may not take for degree credit"}),
  C("NUTC 262", "Sustainable Food Systems and Markets", 3, ["Spring"]),
  C("NUTC 263", "Sustainability and the Food Consumer", 3, ["Summer"]),
  C("NUTC 205", "Nutrition-Related Consumer Marketing", 3, ["Summer"]),
  C("NUTC 212", "Developing Equitable, Inclusive Community Environments for Physical Activity", 3, ["Summer"]),
  C("NUTC 230", "Interpreting Nutrition Evidence", 3, ["Spring"]),
  C("NUTC 269", "Nutrition, Health, and Disease I: Pregnancy to Adolescence", 3, ["Spring"]),
  C("NUTC 270", "Nutrition, Health, and Disease II: Adulthood and Aging", 3, ["Summer"]),
  C("NUTC 285", "Current Controversies in Nutrition Science", 3, ["Summer"]),
  C("NUTR ON236", "International Law and Humanitarian Assistance", 1.5, ["Fall"]),
  C("NUTR 220", "Fundamentals of Writing About Nutrition and Health", 1.5, ["Fall"], {meetings: {Fall: [{d: ["Tue"],s: "17:00",e: "19:00"}]}}),
  C("NUTC 200", "Foundations of Nutrition Science", 3, ["Fall"], {note: "Fully asynchronous online"}),
  C("NUTR 253", "Cellular Agriculture and Biofabricated Food", 3, ["Fall"], {meetings: {Fall: [{d: ["Tue","Thu"],s: "12:00",e: "13:15"}]},note: "Cross-listed (AS&E BME 173)"}),
  C("NUTR 254", "Cellular Agriculture & Cultured Meat Lab", 3, ["Spring"], {meetings: {Spring: [{d: ["Thu"],s: "18:00",e: "21:00"}]},note: "Cross-listed (AS&E BME 174)"}),
  C("NUTR 273", "Social Psychology of Eating Behavior", 3, ["Spring"], {meetings: {Spring: [{d: ["Mon"],s: "18:00",e: "21:00"}]}}),
  C("NUTR ON288", "Customer Discovery & Innovation: Foraging for Market-Fit", 1.5, ["Summer"], {note: "Online"}),
  C("NUTR 311", "Mixed Methods Research", 3, ["Fall"], {meetings: {Fall: [{d: ["Fri"],s: "09:30",e: "12:30"}]}}),
  C("NUTR 316", "Advanced Medical Nutrition Therapy", 3, ["Spring"], {meetings: {Spring: [{d: ["Wed"],s: "13:30",e: "16:30"}]}}),
  C("NUTR 338", "Analyzing Climate Data", 3, ["Spring"], {meetings: {Spring: [{d: ["Fri"],s: "09:00",e: "12:00"}]}}),
  C("NUTR 374", "Advanced Clinical Nutrition Practice in Kidney Disease", 1.5, ["Fall"], {meetings: {Fall: [{d: ["Wed"],s: "16:00",e: "19:00"}]},note: "Meets first half of the term"}),
];

/* Modality per course: "online" | "campus" | "both" (from the AY2026-27 sheet). */
const MODE_BY_CODE = {
  "NUTB 204": "online", "NUTB 206": "both", "NUTB 211": "both", "NUTB 219": "online",
  "NUTB 227": "online", "NUTB 238": "online", "NUTB 243": "online", "NUTB 250": "online",
  "NUTB 300": "both", "NUTB 316": "online", "NUTB 350": "online", "NUTC 200": "online",
  "NUTC 202": "online", "NUTC 205": "online", "NUTC 211": "online", "NUTC 212": "online",
  "NUTC 230": "online", "NUTC 261": "online", "NUTC 262": "online", "NUTC 263": "online",
  "NUTC 269": "online", "NUTC 270": "online", "NUTC 285": "online", "NUTR 202": "both",
  "NUTR 203": "both", "NUTR 204": "both", "NUTR 206": "campus", "NUTR 207": "campus",
  "NUTR 210": "campus", "NUTR 211": "campus", "NUTR 215": "campus", "NUTR 217": "campus",
  "NUTR 218": "campus", "NUTR 220": "both", "NUTR 222": "campus", "NUTR 225": "campus",
  "NUTR 227": "campus", "NUTR 228": "both", "NUTR 233": "campus", "NUTR 236": "campus",
  "NUTR 237": "campus", "NUTR 238": "campus", "NUTR 240": "campus", "NUTR 243": "campus",
  "NUTR 245": "both", "NUTR 246": "campus", "NUTR 248": "campus", "NUTR 253": "campus",
  "NUTR 254": "campus", "NUTR 256": "campus", "NUTR 272": "campus", "NUTR 273": "online",
  "NUTR 278": "campus", "NUTR 280": "both", "NUTR 285": "campus", "NUTR 301": "campus",
  "NUTR 303": "campus", "NUTR 304": "campus", "NUTR 305": "both", "NUTR 307": "campus",
  "NUTR 308": "campus", "NUTR 310": "campus", "NUTR 311": "campus", "NUTR 312": "campus",
  "NUTR 315": "campus", "NUTR 316": "campus", "NUTR 319": "campus", "NUTR 322": "online",
  "NUTR 324": "campus", "NUTR 330": "campus", "NUTR 331": "campus", "NUTR 333": "campus",
  "NUTR 338": "campus", "NUTR 341": "campus", "NUTR 342": "campus", "NUTR 348": "campus",
  "NUTR 370": "both", "NUTR 371": "campus", "NUTR 374": "campus", "NUTR 375": "campus",
  "NUTR ON390": "online", "NUTR 393": "campus", "NUTR 394": "campus", "NUTR 397": "campus",
  "NUTR ON222": "online", "NUTR ON223": "online", "NUTR ON229": "online", "NUTR ON234": "online",
  "NUTR ON236": "online", "NUTR ON237": "online", "NUTR ON256": "online", "NUTR ON288": "online",
  "NUTR ON339": "online", "NUTR ON340": "online", "NUTR ON393": "online",
};

const SPEC_REQS = {
  "Agriculture, Food, and Environment": {required: ["NUTR 215","NUTR 233","NUTR 333","NUTR 341"]},
  "Biochemical and Molecular Nutrition": {required: ["NUTR 204","BCHM 223","NUTR 240","NUTR 309"]},
  "Climate, Sustainability, and Food": {required: ["NUTR ON234","NUTR 256","NUTR 331"],anyOf: []},
  "Community Interventions and Behavior Change": {required: ["NUTR 204","NUTR 228","NUTR 211","NUTR 217"]},
  "Data Analytics and AI in Nutrition": {required: ["NUTR ON390","NUTR 394","NUTR 393"]},
  "Food Policy, Programs, and Economics": {required: ["NUTR 238","NUTR 307"],anyOf: [["NUTR 303","NUTR 304"]]},
  "Food Systems Modeling": {required: ["NUTR 231","NUTR 331","NUTR 342"]},
  "Humanitarian Assistance": {required: ["NUTR 229","NUTR 308"]},
  "Nutrition Communication": {required: ["NUTR 211","NUTR 218","NUTR 322","NUTR 393"]},
  "Nutrition, Diet and Disease Across the Lifecycle": {required: ["NUTR 204","NUTR 272","NUTR 301","NUTR 312"]},
  "Nutrition Entrepreneurship and Innovation": {required: ["NUTR 280","NUTR 284","NUTR 393"]},
  "Nutrition Equity": {required: ["NUTR 238","NUTR 285"],anyOf: [["NUTR 303","NUTR 304"],["NUTR 307"]]},
  "Nutritional Epidemiology and Public Health Nutrition": {required: ["NUTR 204","NUTR 305","NUTR 309","NUTR 319"]},
  "Nutrition Science and Policy": {online: true,pool: ["NUTB 204","NUTB 350","NUTB 300","NUTB 219","NUTB 243","NUTB 227","NUTB 206","NUTB 211","NUTB 316"]},
  "Build Your Own": {byo: true},
};

/* Online-MS specializations: >= 9 credits from the pool. */
const ONLINE_SPEC_REQS = {
  "Nutrition Science and Policy": {online: true,pool: ["NUTB 204","NUTB 350","NUTB 300","NUTB 219","NUTB 243","NUTB 227","NUTB 206","NUTB 211","NUTB 316"]},
  "Climate, Sustainability, and Food": {online: true,pool: ["NUTR ON256","NUTC 262","NUTR ON234","NUTC 263","NUTC 261"]},
  "Data Analytics and AI in Nutrition": {online: true,pool: ["NUTR ON237","NUTB 350","NUTR ON390","NUTR ON393"]},
  "Humanitarian Assistance": {online: true,pool: ["NUTR ON222","NUTR ON223","NUTR ON229","NUTR ON236","NUTR ON339","NUTR ON340"]},
  "Build Your Own": {byo: true},
};

const EQUIV_GROUPS = [["NUTR 238","NUTB 238"],["NUTR 256","NUTR ON256"]];
/* ============================================================================
   PREREQUISITES  (from the Friedman registrar prerequisites page)
   items: every item must be met. { any:[codes] } is met when one of those
   courses is planned in an EARLIER term ({ concurrent:true } also allows the
   same term). { paths:[[...],[...]], label } is met when every item in ANY
   one path is met (alternative pathways). { text } items are background the student confirms by checking
   them off. Any item can be checked off as "met another way" (equivalent
   course, pre-Friedman coursework, or instructor consent).
   recommended:true => shown as guidance only, never flagged.
   ========================================================================== */
const NUTSCI_202 = ["NUTR 202", "NUTC 202"];
const PREREQS = {
  "NUTR 202": { official: "One semester college-level human biology, chemistry, or physiology (preferred).", items: [{ text: "One college course in human biology, chemistry, or physiology" }] },
  "NUTC 202": { official: "One semester college-level human biology, chemistry, or physiology (preferred).", items: [{ text: "One college course in human biology, chemistry, or physiology" }] },
  "NUTR 218": { official: "NUTR 211 or NUTB 211, or instructor consent.", items: [{ any: ["NUTR 211", "NUTB 211"] }] },
  "NUTR 228": { official: "NUTR 202 or equivalent.", items: [{ any: NUTSCI_202 }] },
  "NUTR 233": { official: "NUTR 215, or instructor consent.", items: [{ any: ["NUTR 215"] }] },
  "NUTR 245": { official: "Undergraduate chemistry/biology, or instructor permission.", items: [{ text: "Undergraduate chemistry or biology" }] },
  "NUTR 246": { official: "Undergraduate-level biology or chemistry, or instructor consent.", items: [{ text: "Undergraduate biology or chemistry" }] },
  "NUTR 248": { official: "NUTR 202 or equivalent, or instructor permission.", items: [{ any: NUTSCI_202 }] },
  "NUTR 253": { official: "Cell biology / biomedical engineering background, or instructor permission.", items: [{ text: "Cell biology or biomedical engineering background" }] },
  "NUTR 254": { official: "NUTR 253 / BME 173, or instructor permission.", items: [{ any: ["NUTR 253"] }] },
  "NUTR 272": { official: "NUTR 202 or NUTR 245/246; undergraduate physiology recommended.", items: [{ any: [...NUTSCI_202, "NUTR 245", "NUTR 246"] }] },
  "NUTR 273": { official: "Recommended: NUTR 211 or NUTB 211.", recommended: true, items: [{ any: ["NUTR 211", "NUTB 211"] }] },
  "NUTR 284": { official: "NUTR 203 or NUTB 206 or NUTR 215.", items: [{ any: ["NUTR 203", "NUTB 206", "NUTR 215"] }] },
  "NUTR 301": { official: "NUTR 202 or NUTR 245/246.", items: [{ any: [...NUTSCI_202, "NUTR 245", "NUTR 246"] }] },
  "NUTR 303": { official: "NUTR 238 and NUTR 207/307 or equivalent, or instructor consent.", items: [{ any: ["NUTR 238"] }, { any: ["NUTR 207", "NUTR 307"] }] },
  "NUTR 304": { official: "NUTR 203 and NUTR 238, or instructor consent (may not be concurrent).", items: [{ any: ["NUTR 203"] }, { any: ["NUTR 238"] }] },
  "NUTR 305": { official: "NUTR 202 or equivalent; NUTR 204 or equivalent; and one biostatistics pathway or equivalent: NUTR 206 plus NUTR 309, or NUTR 207 plus NUTR 307. Take the introductory course (206 or 207) before NUTR 305; the intermediate course (309 or 307) may come before or run concurrently.", items: [{ any: NUTSCI_202 }, { any: ["NUTR 204"] }, { label: "Biostatistics pathway: NUTR 206 + NUTR 309, or NUTR 207 + NUTR 307", short: "biostatistics pathway", paths: [[{ any: ["NUTR 206"] }, { any: ["NUTR 309"], concurrent: true }], [{ any: ["NUTR 207"] }, { any: ["NUTR 307"], concurrent: true }]] }] },
  "NUTR 306": { official: "NUTR 220, or instructor consent (may not be concurrent).", items: [{ any: ["NUTR 220"] }] },
  "NUTR 307": { official: "NUTR 207 or NUTR 206.", items: [{ any: ["NUTR 207", "NUTR 206"] }] },
  "NUTR 309": { official: "NUTR 206 or NUTR 207; ability to do exploratory data analysis in R.", items: [{ any: ["NUTR 206", "NUTR 207"] }, { text: "Can do exploratory data analysis in R" }] },
  "NUTR 315": { official: "NUTR 202 or equivalent, plus one undergraduate biochemistry course within five years.", items: [{ any: NUTSCI_202 }, { text: "Undergraduate biochemistry within the last five years" }] },
  "NUTR 319": { official: "NUTR 204 or equivalent; NUTR 206 or NUTR 207 or equivalent.", items: [{ any: ["NUTR 204"] }, { any: ["NUTR 206", "NUTR 207"] }] },
  "NUTR 330": { official: "Some social science background.", items: [{ text: "Some social science background" }] },
  "NUTR 331": { official: "Prior experience with quantitative data in Excel or equivalent.", items: [{ text: "Experience with quantitative data in Excel (or similar)" }] },
  "NUTR 333": { official: "NUTR 215 and NUTR 233, or instructor consent.", items: [{ any: ["NUTR 215"] }, { any: ["NUTR 233"] }] },
  "NUTR 341": { official: "NUTR 238 or a similar microeconomics course, or instructor consent.", items: [{ any: ["NUTR 238"] }] },
  "NUTR 342": { official: "NUTR 231 or equivalent.", items: [{ any: ["NUTR 231"] }] },
  "NUTR 370": { official: "Familiarity with NUTR 202 and Tufts biochemistry course material.", items: [{ text: "Familiar with NUTR 202 and biochemistry material" }] },
  "NUTR 374": { official: "NUTR 315 or equivalent and NUTR 316 or equivalent.", items: [{ any: ["NUTR 315"] }, { any: ["NUTR 316", "NUTB 316"] }] },
  "NUTR 375": { official: "NUTR 204/PH 201, NUTR 206/PH 205, and NUTR 309.", items: [{ any: ["NUTR 204"] }, { any: ["NUTR 206"] }, { any: ["NUTR 309"] }] },
  "NUTR 394": { official: "Basic working knowledge of statistical methods in environmental and/or nutrition research and epidemiology.", items: [{ text: "Working knowledge of statistics / epidemiology methods" }] },
  "NUTR ON340": { official: "NUTR ON339: Livelihoods, Food Security & Nutrition.", items: [{ any: ["NUTR ON339"], concurrent: true }] },
  "NUTC 230": { official: "NUTC 200 or NUTC 202 or a prior general nutrition course.", items: [{ any: ["NUTC 200", "NUTC 202", "NUTR 202"] }] },
  "NUTC 269": { official: "NUTC 202 or equivalent.", items: [{ any: NUTSCI_202 }] },
  "NUTB 204": { official: "NUTB 250 or equivalent, or undergraduate biostatistics.", items: [{ any: ["NUTB 250"] }] },
  "NUTB 227": { official: "One semester of general nutrition, and NUTB 206 or NUTR 203 (or program director approval).", items: [{ text: "One semester of general nutrition" }, { any: ["NUTB 206", "NUTR 203"] }] },
  "NUTB 243": { official: "General nutrition and a physiology / mammalian biology class.", items: [{ text: "General nutrition and a physiology or mammalian biology class" }] },
  "NUTB 350": { official: "NUTB 250 or equivalent.", items: [{ any: ["NUTB 250"] }] },
};

/* ---------- derived lookups ---------- */
const CAT_BY_CODE = {};
CATALOG.forEach((c) => { if (!CAT_BY_CODE[c.code]) CAT_BY_CODE[c.code] = c; });
const modeOf = (c) => MODE_BY_CODE[c.code] || (c.fam === "R" || c.fam === "X" ? "campus" : "online");
const CATALOG_CLEAN = Object.values(CAT_BY_CODE).map((c) => ({ ...c, mode: modeOf(c) }));
CATALOG_CLEAN.forEach((c) => { CAT_BY_CODE[c.code] = c; });
const EQUIV = {};
EQUIV_GROUPS.forEach((g) => g.forEach((c) => { EQUIV[c] = g.filter((x) => x !== c); }));
const equivOf = (code) => EQUIV[code] || [];

function specReqFor(specName, program) {
  if (program === "online" && ONLINE_SPEC_REQS[specName]) return ONLINE_SPEC_REQS[specName];
  return SPEC_REQS[specName] || { required: [] };
}

/* ---------- time helpers ---------- */
function toMin(hhmm) { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; }
function blocksOverlap(a, b) {
  if (!a.d.some((d) => b.d.includes(d))) return false;
  return toMin(a.s) < toMin(b.e) && toMin(b.s) < toMin(a.e);
}
function fmtBlock(bk) {
  const to12 = (hhmm) => { let [h, m] = hhmm.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${h}:${String(m).padStart(2, "0")} ${ap}`; };
  return `${bk.d.join("/")} ${to12(bk.s)}–${to12(bk.e)}`;
}

function resolveCourse(item) {
  // custom courses are objects; older saves also stored catalog courses as objects,
  // so prefer the current catalog entry whenever one exists.
  if (item && typeof item === "object") return (!item.custom && CAT_BY_CODE[item.code]) || item;
  return CAT_BY_CODE[item] || { code: item, title: item, cr: 3, fam: familyOf(item), terms: [], fulfills: [], meetings: {} };
}
const itemCode = (it) => (typeof it === "object" ? it.code : it);

/* ---------- experiential learning helpers ---------- */
// Older plans stored {hours, completed}; newer ones store {hours (planned), done}.
function normalizeExp(list) {
  return (list || []).map((e) => ({ ...e, done: e.done != null ? e.done : e.completed ? e.hours : "" }));
}
function expTotals(list) {
  const n = normalizeExp(list);
  return {
    planned: n.reduce((s, e) => s + (Number(e.hours) || 0), 0),
    done: n.reduce((s, e) => s + (Number(e.done) || 0), 0),
  };
}
function legacyExp(rec) {
  return rec.expEntries || (rec.expHours ? [{ id: "e0", name: "Experiential learning", hours: rec.expHours, done: "" }] : []);
}
function expSummary(thesis, planned, done) {
  if (thesis) return "Satisfied by master's thesis";
  if (!planned && !done) return `Not logged yet (${EL_HOURS} hrs needed)`;
  return `${done} of ${EL_HOURS} hrs done · ${planned} planned`;
}

/* ---------- prerequisite engine ---------- */
function prereqStatus(placed, semesters, checks) {
  const idx = {};
  (semesters || []).forEach((s, i) => { idx[s.id] = i; });
  const where = {};
  Object.entries(placed || {}).forEach(([sid, arr]) => (arr || []).forEach((it) => {
    if (idx[sid] != null) where[itemCode(it)] = { i: idx[sid], sid };
  }));
  const findAny = (codes) => {
    let best = null;
    codes.forEach((c) => [c, ...equivOf(c)].forEach((x) => {
      if (where[x] && (!best || where[x].i < best.i)) best = { ...where[x], code: x };
    }));
    return best;
  };
  const out = [];
  Object.entries(placed || {}).forEach(([sid, arr]) => {
    if (idx[sid] == null) return;
    (arr || []).forEach((it) => {
      const code = itemCode(it);
      const p = PREREQS[code];
      if (!p) return;
      const ck = (checks || {})[code] || [];
      const semIdx = (x) => (x.where != null ? idx[x.where] : -1);
      const evalAny = (item) => {
        const hit = findAny(item.any);
        if (!hit) return { status: "missing", label: item.any.join(" or ") };
        const ok = item.concurrent ? hit.i <= idx[sid] : hit.i < idx[sid];
        return { status: ok ? "planned" : "late", where: hit.sid, hitCode: hit.code, label: item.any.join(" or ") };
      };
      const items = p.items.map((item, k) => {
        const label = item.label || item.text || item.any.join(" or ");
        if (ck[k]) return { label, kind: item.text ? "text" : "course", status: "checked" };
        if (item.paths) {
          const short = item.short;
          // Alternative pathways: met when every item in one path is met.
          const res = item.paths.map((path) => path.map(evalAny));
          const done = res.find((r) => r.every((x) => x.status === "planned"));
          if (done) {
            const last = done.reduce((a, b) => (semIdx(b) > semIdx(a) ? b : a));
            return { label, kind: "course", status: "planned", short, where: last.where, note: `met by ${done.map((x) => x.hitCode).join(" + ")}` };
          }
          // Not met: report on the path the student has started furthest.
          const score = (r) => r.filter((x) => x.status !== "missing").length;
          const best = res.reduce((a, b) => (score(b) > score(a) ? b : a));
          if (!score(best)) return { label, kind: "course", status: "missing", short, note: "no pathway in your plan" };
          const probs = best.filter((x) => x.status !== "planned")
            .map((x) => (x.status === "late" ? `${x.hitCode} needs an earlier term` : `add ${x.label}`));
          const late = best.some((x) => x.status === "late");
          return { label, kind: "course", status: late ? "late" : "missing", short, note: probs.join("; ") };
        }
        if (item.any) {
          const hit = findAny(item.any);
          if (hit) {
            const ok = item.concurrent ? hit.i <= idx[sid] : hit.i < idx[sid];
            return { label, kind: "course", status: ok ? "planned" : "late", where: hit.sid, hitCode: hit.code };
          }
          return { label, kind: "course", status: "missing" };
        }
        return { label, kind: "text", status: "confirm" };
      });
      const unmet = p.recommended ? 0 : items.filter((x) => x.status === "missing" || x.status === "late" || x.status === "confirm").length;
      out.push({ sid, code, official: p.official, recommended: !!p.recommended, items, unmet });
    });
  });
  return out;
}

/* ---------- pure requirement engine (live plan AND advisor worksheet) ---------- */
function analyzePlan({ placed, semesters, specs, program, priorCourses, prereqChecks }) {
  placed = placed || {}; semesters = semesters || []; specs = specs || []; priorCourses = priorCourses || [];
  const courses = Object.values(placed).flat().map(resolveCourse);
  const codes = new Set(courses.map((c) => c.code));
  const has = (code) => codes.has(code) || equivOf(code).some((x) => codes.has(x));
  const totalCr = courses.reduce((s, c) => s + (c.cr || 0), 0);

  const externalSats = [
    ...priorCourses.filter((p) => p.countsToward && p.countsToward !== "elective")
      .map((p) => ({ satisfies: p.countsToward, cr: Number(p.cr) || 0, label: p.title || "Prior course", prior: true })),
    ...courses.filter((c) => c.custom && c.approved && c.satisfies && c.satisfies !== "elective")
      .map((c) => ({ satisfies: c.satisfies, cr: c.cr || 0, label: c.code, prior: false })),
  ];
  const extHas = (k) => externalSats.some((e) => e.satisfies === k);
  const extForSpec = (nm) => externalSats.filter((e) => e.satisfies === "spec:" + nm);

  const nutsci = has("NUTC 202") || has("NUTR 202") || (has("NUTR 245") && has("NUTR 246")) || (has("NUTR 370") && has("NUTR 371")) || extHas("nutsci");
  const quant = courses.some((c) => (c.fulfills || []).includes("quant")) || extHas("quant");
  const policyPair = has("NUTR ON222") && has("NUTR ON223");
  const policySingle = courses.some((c) => (c.fulfills || []).includes("policy") && c.code !== "NUTR ON222" && c.code !== "NUTR ON223");
  const policy = policySingle || policyPair || extHas("policy");

  const specResults = specs.map((sName) => {
    const req = specReqFor(sName, program);
    const subs = extForSpec(sName);
    if (req.byo) return { name: sName, byo: true, subs };
    if (req.online || req.pool) {
      const pool = req.pool || [];
      const inPool = courses.filter((c) => pool.includes(c.code) || equivOf(c.code).some((x) => pool.includes(x)));
      const subCr = subs.reduce((s, e) => s + (e.cr || 0), 0);
      const cr = inPool.reduce((s, c) => s + (c.cr || 0), 0) + subCr;
      return { name: sName, online: true, poolHave: inPool.map((c) => c.code), poolCr: cr, subs, ok: cr >= 9 };
    }
    const reqCourses = req.required || [];
    const haveReq = reqCourses.filter((rc) => has(rc));
    const anyGroups = (req.anyOf || []).map((g) => ({ group: g, satisfied: g.some((x) => has(x)) }));
    const ok = haveReq.length + subs.length >= reqCourses.length && anyGroups.every((a) => a.satisfied);
    return { name: sName, required: reqCourses, have: haveReq, anyGroups, subs, ok };
  });

  const inPersonNUTR = courses.filter((c) => c.fam === "R" && !c.directed);
  const onlineCredits = courses.filter((c) => c.fam !== "R" && c.fam !== "X").reduce((s, c) => s + (c.cr || 0), 0);
  const directedCr = courses.filter((c) => c.directed).reduce((s, c) => s + (c.cr || 0), 0);

  const conflicts = [];
  const termWarnings = [];
  Object.entries(placed).forEach(([sid, arr]) => {
    const sem = semesters.find((s) => s.id === sid);
    if (!sem) return;
    const objs = (arr || []).map(resolveCourse);
    objs.forEach((c) => {
      if (c.terms && c.terms.length && !c.terms.includes(sem.term)) termWarnings.push({ code: c.code, sid, term: sem.term, offered: c.terms });
    });
    for (let i = 0; i < objs.length; i++) {
      for (let j = i + 1; j < objs.length; j++) {
        const bi = (objs[i].meetings && objs[i].meetings[sem.term]) || [];
        const bj = (objs[j].meetings && objs[j].meetings[sem.term]) || [];
        for (const a of bi) for (const b of bj) if (blocksOverlap(a, b)) conflicts.push({ sid, a: objs[i].code, b: objs[j].code, when: fmtBlock(a) });
      }
    }
  });

  const prereqs = prereqStatus(placed, semesters, prereqChecks);
  const prereqFlags = prereqs.filter((p) => p.unmet > 0);

  return {
    totalCr, nutsci, quant, policy, policyPair, specResults,
    inPersonCount: inPersonNUTR.length, inPersonList: inPersonNUTR.map((c) => c.code),
    onlineCredits, directedCr, conflicts, termWarnings, prereqs, prereqFlags,
  };
}

/* ---------- local storage wrapper (fallback when no plan server) ---------- */
const mem = {};
const hasWinStore = typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";
const hasLS = (() => {
  try { const k = "__probe__"; window.localStorage.setItem(k, "1"); window.localStorage.removeItem(k); return true; }
  catch (e) { return false; }
})();
const store = {
  async set(key, val, shared = true) {
    try { if (hasWinStore) return await window.storage.set(key, val, shared); } catch (e) {}
    try { if (hasLS) { window.localStorage.setItem(key, val); return { key, value: val }; } } catch (e) {}
    mem[key] = val; return { key, value: val };
  },
  async get(key, shared = true) {
    try { if (hasWinStore) return await window.storage.get(key, shared); } catch (e) {}
    try { if (hasLS) { const v = window.localStorage.getItem(key); return v == null ? null : { key, value: v }; } } catch (e) {}
    return key in mem ? { key, value: mem[key] } : null;
  },
  async list(prefix, shared = true) {
    try { if (hasWinStore) return await window.storage.list(prefix, shared); } catch (e) {}
    try {
      if (hasLS) {
        const keys = [];
        for (let i = 0; i < window.localStorage.length; i++) { const k = window.localStorage.key(i); if (k && k.startsWith(prefix)) keys.push(k); }
        return { keys };
      }
    } catch (e) {}
    return { keys: Object.keys(mem).filter((k) => k.startsWith(prefix)) };
  },
};
const slug = (s) => (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* ---------- shared plan server (Google Apps Script) ---------- */
async function serverSave(record) {
  if (!SYNC_URL) return { ok: false, off: true };
  try {
    const r = await fetch(SYNC_URL, { method: "POST", redirect: "follow", body: JSON.stringify({ action: "save", slug: slug(record.name), record }) });
    const j = await r.json();
    return j && j.ok ? { ok: true } : { ok: false, error: (j && j.error) || "server error" };
  } catch (e) { return { ok: false, error: "could not reach the plan server" }; }
}
async function serverLoad(name, pass) {
  if (!SYNC_URL) return { ok: false, off: true };
  try {
    const r = await fetch(`${SYNC_URL}?action=load&slug=${encodeURIComponent(slug(name))}&pass=${encodeURIComponent(pass)}`, { redirect: "follow" });
    return await r.json();
  } catch (e) { return { ok: false, error: "could not reach the plan server" }; }
}
async function serverList(key) {
  if (!SYNC_URL) return { ok: false, off: true };
  try {
    const r = await fetch(`${SYNC_URL}?action=list&key=${encodeURIComponent(key)}`, { redirect: "follow" });
    return await r.json();
  } catch (e) { return { ok: false, error: "could not reach the plan server" }; }
}

/* ---------- "counts toward" options ---------- */
function countsOptions(specs) {
  return [
    { value: "elective", label: "General elective (no specific requirement)" },
    { value: "nutsci", label: "Nutrition science core" },
    { value: "quant", label: "Quantitative reasoning core" },
    { value: "policy", label: "Policy & programs core" },
    ...(specs || []).map((s) => ({ value: "spec:" + s, label: "Specialization: " + s })),
  ];
}
function labelForCounts(value, specs) {
  if (!value || value === "elective") return "general elective";
  const found = countsOptions(specs).find((o) => o.value === value);
  return found ? found.label : value;
}
function shortCounts(value) {
  if (value === "nutsci") return "nutrition science core";
  if (value === "quant") return "quant core";
  if (value === "policy") return "policy core";
  if (value && value.startsWith("spec:")) return value.slice(5);
  return "elective";
}

/* ---------- semesters ---------- */
const TERM_ORDER = ["Spring", "Summer", "Fall"];
function buildSemesters(startTerm, startYear) {
  const out = [];
  let ti = TERM_ORDER.indexOf(startTerm), yr = Number(startYear) || new Date().getFullYear();
  for (let i = 0; i < 6; i++) {
    out.push({ id: `${TERM_ORDER[ti]}-${yr}`, term: TERM_ORDER[ti], year: yr });
    ti++; if (ti >= 3) { ti = 0; yr++; }
  }
  return out;
}
const semLabel = (semesters, sid) => { const s = (semesters || []).find((x) => x.id === sid); return s ? `${s.term} ${s.year}` : sid; };

/* ---------- plain-text / HTML report sections shared by email + Word ---------- */
function prereqLines(analysis, semesters) {
  return analysis.prereqFlags.map((p) => `${p.code} (${semLabel(semesters, p.sid)}): ` +
    p.items.filter((x) => x.status !== "planned" && x.status !== "checked")
      .map((x) => (x.note ? `${x.short || x.label}: ${x.note}` : x.status === "late" ? `${x.label} is planned too late` : x.status === "confirm" ? `confirm "${x.label}"` : `${x.label} not in plan`)).join("; "));
}

/* ============================================================================
   MAIN COMPONENT
   ========================================================================== */
export default function App() {
  const [screen, setScreen] = useState("setup");
  const [program, setProgram] = useState("online");
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [startTerm, setStartTerm] = useState("Fall");
  const [startYear, setStartYear] = useState(String(new Date().getFullYear()));
  const [intl, setIntl] = useState(false);
  const [specs, setSpecs] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [placed, setPlaced] = useState({});
  const [expEntries, setExpEntries] = useState([]); // [{id,name,hours,done}]
  const [thesis, setThesis] = useState(false);
  const [priorCourses, setPriorCourses] = useState([]);
  const [comments, setComments] = useState("");
  const [wishlist, setWishlist] = useState([]); // [{code,note}]
  const [prereqChecks, setPrereqChecks] = useState({}); // { code: [bool per item] }
  const [passcode2, setPasscode2] = useState("");
  const [toast, setToast] = useState("");
  const [loadMsg, setLoadMsg] = useState("");

  const specOptions = program === "online" ? ONLINE_SPECS : CAMPUS_SPECS;
  const specLimit = program === "online" ? 1 : 2;
  const creditTarget = program === "online" ? 30 : 48;
  const { planned: expHours, done: expDone } = expTotals(expEntries);

  useEffect(() => { if (toast) { const x = setTimeout(() => setToast(""), 2600); return () => clearTimeout(x); } }, [toast]);

  function beginPlanning() {
    if (!name.trim()) { setToast("Enter your name to continue."); return; }
    const sems = buildSemesters(startTerm, startYear);
    setSemesters(sems);
    setPlaced((p) => (Object.keys(p).length ? p : sems.reduce((a, s) => ((a[s.id] = []), a), {})));
    setScreen("plan");
  }

  const placedCodes = useMemo(() => {
    const s = new Set();
    Object.values(placed).forEach((arr) => (arr || []).forEach((it) => s.add(itemCode(it))));
    return s;
  }, [placed]);

  function addToSemester(item, sid) {
    const obj = resolveCourse(item);
    const code = obj.code;
    const sem = semesters.find((s) => s.id === sid);
    if (sem && obj.terms && obj.terms.length && !obj.terms.includes(sem.term)) {
      setToast(`${code} isn't offered in ${sem.term} — it runs in ${obj.terms.join(" / ")}.`);
      return;
    }
    setPlaced((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { next[k] = (next[k] || []).filter((it) => itemCode(it) !== code); });
      next[sid] = [...(next[sid] || []), obj.custom ? obj : code];
      return next;
    });
  }
  function removeFromPlan(code) {
    setPlaced((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { next[k] = (next[k] || []).filter((it) => itemCode(it) !== code); });
      return next;
    });
  }

  function toggleWish(code) {
    setWishlist((cur) => (cur.some((w) => w.code === code) ? cur.filter((w) => w.code !== code) : [...cur, { code, note: "" }]));
  }
  function togglePrereqCheck(code, k) {
    setPrereqChecks((cur) => {
      const arr = [...(cur[code] || [])];
      arr[k] = !arr[k];
      return { ...cur, [code]: arr };
    });
  }

  const dragCode = useRef(null);
  const [activeSem, setActiveSem] = useState(null);

  const analysis = useMemo(
    () => analyzePlan({ placed, semesters, specs, program, priorCourses, prereqChecks }),
    [placed, semesters, specs, program, priorCourses, prereqChecks]
  );

  /* ----- save / load ----- */
  async function savePlan() {
    if (!name.trim()) { setToast("Add your name first."); return; }
    if (!passcode.trim()) { setToast("Set a passcode so you can reload later."); return; }
    if (passcode !== passcode2) { setToast("Passcodes don't match — re-enter them in both boxes."); return; }
    const key = `plan:${slug(name)}`;
    const record = {
      name, passcode, program, startTerm, startYear, intl, specs, semesters, placed,
      expEntries, thesis, priorCourses, comments, wishlist, prereqChecks,
      savedAt: new Date().toISOString(),
    };
    await store.set(key, JSON.stringify(record), true);
    if (!SYNC_URL) { setToast("Plan saved in this browser only. Email or download it to share it — or ask your advisor to enable the shared plan server."); return; }
    const res = await serverSave(record);
    if (res.ok) setToast("Plan saved. You can reload it from any browser with your name + passcode.");
    else setToast(`Saved in this browser, but the shared server failed (${res.error}). Try again, or email your plan.`);
  }
  function applyRecord(rec) {
    setProgram(rec.program); setStartTerm(rec.startTerm); setStartYear(rec.startYear);
    setIntl(!!rec.intl); setSpecs(rec.specs || []); setSemesters(rec.semesters || []);
    setPlaced(rec.placed || {});
    setExpEntries(normalizeExp(legacyExp(rec)));
    setThesis(!!rec.thesis);
    setPriorCourses(rec.priorCourses || []);
    setComments(rec.comments || "");
    setWishlist(rec.wishlist || []);
    setPrereqChecks(rec.prereqChecks || {});
    setPasscode2(passcode);
    setLoadMsg(""); setScreen("plan"); setToast("Plan loaded.");
  }
  async function loadPlan() {
    if (!name.trim() || !passcode.trim()) { setLoadMsg("Enter the same name and passcode you saved with."); return; }
    let serverErr = "";
    if (SYNC_URL) {
      const res = await serverLoad(name, passcode);
      if (res.ok && res.record) {
        await store.set(`plan:${slug(name)}`, JSON.stringify(res.record), true);
        applyRecord(res.record);
        return;
      }
      serverErr = res.error || "";
    }
    const local = await store.get(`plan:${slug(name)}`, true);
    if (local && local.value) {
      let rec; try { rec = JSON.parse(local.value); } catch (e) { setLoadMsg("Saved plan could not be read."); return; }
      if (rec.passcode === passcode) { applyRecord(rec); return; }
      setLoadMsg("Passcode doesn't match this name."); return;
    }
    setLoadMsg(serverErr || (SYNC_URL ? "No saved plan found for that name (checked the shared server and this browser)." : "No saved plan found for that name in this browser."));
  }

  /* ----- email / Word ----- */
  const expLine = `Experiential learning: ${expSummary(thesis, expHours, expDone)}`;
  function planText() {
    const lines = [];
    lines.push(`Friedman MS plan — ${name}`);
    lines.push(`Program: ${program === "online" ? "Online MS (30 cr)" : "On-campus MS (48 cr)"}`);
    lines.push(`Started: ${startTerm} ${startYear}${intl ? " · international student" : ""}`);
    lines.push(`Specialization(s): ${specs.join("; ") || "—"}`);
    lines.push(`Planned credits: ${analysis.totalCr} / ${creditTarget}`);
    lines.push(expLine);
    if (comments && comments.trim()) {
      lines.push(""); lines.push("Student comments / requests:");
      comments.trim().split("\n").forEach((l) => lines.push("   " + l));
    }
    lines.push("");
    semesters.forEach((s) => {
      const arr = (placed[s.id] || []).map(resolveCourse);
      if (!arr.length) return;
      lines.push(`${s.term} ${s.year}:`);
      arr.forEach((c) => lines.push(`   • ${c.code} — ${c.title} (${c.cr} cr)${c.approved ? " [advisor-approved]" : ""}`));
    });
    if (!thesis && expEntries.length) {
      lines.push(""); lines.push("Experiential learning:");
      expEntries.forEach((e) => lines.push(`   • ${e.name || "(untitled)"} — ${Number(e.done) || 0} of ${e.hours || 0} hrs done`));
    }
    if (wishlist.length) {
      lines.push(""); lines.push("Elective wish list:");
      wishlist.forEach((w) => { const c = wishCourse(w); lines.push(`   • ${c.code} — ${c.title}${c.school ? " [" + c.school + "]" : ""}${placedCodes.has(c.code) ? " (in plan)" : ""}${w.note ? " — " + w.note : ""}`); });
    }
    if (priorCourses.length) {
      lines.push(""); lines.push("Courses from before Friedman (advisor-approved to count):");
      priorCourses.forEach((p) => lines.push(`   • ${p.title || "(untitled)"}${p.institution ? " — " + p.institution : ""}${p.cr ? " (" + p.cr + " cr)" : ""} → ${labelForCounts(p.countsToward, specs)}`));
    }
    lines.push(""); lines.push("Requirement check:");
    lines.push(`   Nutrition science core: ${analysis.nutsci ? "met" : "not yet"}`);
    lines.push(`   Quantitative reasoning core: ${analysis.quant ? "met" : "not yet"}`);
    lines.push(`   Policy & programs core: ${analysis.policy ? "met" : "not yet"}`);
    analysis.specResults.forEach((r) => {
      if (r.byo) lines.push(`   Specialization "${r.name}": Build Your Own (advisor review)`);
      else if (r.online) lines.push(`   Specialization "${r.name}": ${r.poolCr} cr in area ${r.ok ? "(meets 9 cr)" : "(needs 9 cr)"}`);
      else lines.push(`   Specialization "${r.name}": ${r.have.length + (r.subs ? r.subs.length : 0)}/${(r.required || []).length} required ${r.ok ? "(complete)" : "(in progress)"}`);
    });
    if (analysis.conflicts.length) lines.push(`   Time conflicts flagged: ${analysis.conflicts.length}`);
    const pl = prereqLines(analysis, semesters);
    if (pl.length) { lines.push("   Prerequisites to check:"); pl.forEach((l) => lines.push("      - " + l)); }
    return lines.join("\n");
  }
  function mailtoHref() {
    const subject = encodeURIComponent(`Friedman MS plan — ${name || "student"}`);
    const body = encodeURIComponent("Hi,\n\nPlease find my degree plan below.\n\n----------------------------------------\n" + planText());
    return `mailto:${ADVISOR_EMAIL}?subject=${subject}&body=${body}`;
  }
  function planHtml() {
    const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const yn = (b) => (b ? "Met" : "Not yet");
    const semRows = semesters.map((s) => {
      const arr = (placed[s.id] || []).map(resolveCourse);
      if (!arr.length) return "";
      const items = arr.map((c) => `<li>${esc(c.code)} — ${esc(c.title)} (${c.cr} cr)${c.approved ? " <i>[advisor-approved]</i>" : ""}</li>`).join("");
      const semCr = arr.reduce((a, c) => a + (c.cr || 0), 0);
      return `<h3 style="color:#00833d;margin:12px 0 4px">${esc(s.term)} ${s.year} <span style="font-weight:normal;color:#555">— ${semCr} cr</span></h3><ul>${items}</ul>`;
    }).join("");
    const specRows = analysis.specResults.map((r) => {
      if (r.byo) return `<li>${esc(r.name)}: Build Your Own (advisor review)</li>`;
      if (r.online) return `<li>${esc(r.name)}: ${r.poolCr} cr in area — ${r.ok ? "meets 9 cr" : "needs 9 cr"}</li>`;
      return `<li>${esc(r.name)}: ${r.have.length + (r.subs ? r.subs.length : 0)}/${(r.required || []).length} required — ${r.ok ? "complete" : "in progress"}</li>`;
    }).join("");
    const expRows = thesis ? "" : expEntries.map((e) => `<li>${esc(e.name) || "(untitled)"} — ${Number(e.done) || 0} of ${esc(e.hours || 0)} hrs done</li>`).join("");
    const wishRows = wishlist.map((w) => { const c = wishCourse(w); return `<li>${esc(c.code)} — ${esc(c.title)}${c.school ? " [" + esc(c.school) + "]" : ""}${placedCodes.has(c.code) ? " <i>(in plan)</i>" : ""}${w.note ? " — " + esc(w.note) : ""}</li>`; }).join("");
    const priorRows = priorCourses.map((p) => `<li>${esc(p.title) || "(untitled)"}${p.institution ? " — " + esc(p.institution) : ""}${p.cr ? " (" + esc(p.cr) + " cr)" : ""} → ${esc(labelForCounts(p.countsToward, specs))}</li>`).join("");
    const preRows = prereqLines(analysis, semesters).map((l) => `<li>${esc(l)}</li>`).join("");
    return `<!doctype html><html><head><meta charset="utf-8"><title>Friedman MS plan — ${esc(name)}</title></head>
<body style="font-family:Georgia,serif;color:#16334f;max-width:720px">
<h1 style="color:#3172ac">Friedman MS Degree Plan</h1>
<p><b>${esc(name) || "Student"}</b><br/>
${program === "online" ? "Online MS (30 credits)" : "On-campus MS (48 credits)"}<br/>
Started: ${esc(startTerm)} ${esc(startYear)}${intl ? " · international student" : ""}<br/>
Specialization(s): ${esc(specs.join("; ")) || "—"}<br/>
Planned credits: ${analysis.totalCr} / ${creditTarget}<br/>
${esc(expLine)}</p>
${comments && comments.trim() ? `<h2 style="color:#3172ac">Student comments / requests</h2><p>${esc(comments.trim()).replace(/\n/g, "<br/>")}</p>` : ""}
<h2 style="color:#3172ac">Semester plan</h2>${semRows || "<p>(no courses placed yet)</p>"}
${expRows ? `<h2 style="color:#3172ac">Experiential learning</h2><ul>${expRows}</ul>` : ""}
${wishRows ? `<h2 style="color:#3172ac">Elective wish list</h2><ul>${wishRows}</ul>` : ""}
${priorRows ? `<h2 style="color:#3172ac">Courses from before Friedman (advisor-approved)</h2><ul>${priorRows}</ul>` : ""}
<h2 style="color:#3172ac">Requirement check</h2>
<ul><li>Nutrition science core: ${yn(analysis.nutsci)}</li><li>Quantitative reasoning core: ${yn(analysis.quant)}</li><li>Policy &amp; programs core: ${yn(analysis.policy)}</li>${specRows}</ul>
${analysis.conflicts.length ? `<p style="color:#b0402f">Time conflicts flagged: ${analysis.conflicts.length}</p>` : ""}
${preRows ? `<h3 style="color:#b06a12">Prerequisites to check</h3><ul>${preRows}</ul>` : ""}
<hr/><p style="font-size:12px;color:#777">Planning aid only — confirm course availability and prerequisites in SIS when registering. Offerings change year to year; revisit this plan annually.</p>
</body></html>`;
  }
  function downloadPlan() {
    try {
      const blob = new Blob(["﻿", planHtml()], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `Friedman MS plan - ${name || "student"}.doc`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setToast("Downloading your plan as a Word document.");
    } catch (e) { setToast("Download was blocked by the browser. Try the email button instead."); }
  }

  return (
    <div style={{ fontFamily: t.sans, color: t.ink, background: t.paper, minHeight: "100vh" }}>
      <Header screen={screen} setScreen={setScreen} />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 64px" }}>
        {screen === "setup" && (
          <Setup {...{ program, setProgram, name, setName, passcode, setPasscode, startTerm, setStartTerm, startYear, setStartYear, intl, setIntl, specs, setSpecs, specOptions, specLimit, beginPlanning, loadPlan, loadMsg }} />
        )}
        {screen === "plan" && (
          <Plan {...{ program, name, setName, passcode, setPasscode, passcode2, setPasscode2, comments, setComments, specs, setSpecs, specOptions, specLimit, creditTarget, semesters, setSemesters, placed, setPlaced, placedCodes, addToSemester, removeFromPlan, dragCode, activeSem, setActiveSem, analysis, expEntries, setExpEntries, expHours, expDone, thesis, setThesis, priorCourses, setPriorCourses, wishlist, setWishlist, toggleWish, togglePrereqCheck, savePlan, mailtoHref, downloadPlan, intl }} />
        )}
        {screen === "advisor" && <Advisor />}
      </div>
      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: t.navyDeep, color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 14, boxShadow: "0 6px 24px rgba(0,0,0,.25)", zIndex: 50 }}>{toast}</div>
      )}
    </div>
  );
}

/* ---------------------------------- Header --------------------------------- */
function Header({ screen, setScreen }) {
  return (
    <div style={{ background: t.blue, color: "#fff", borderBottom: `4px solid ${t.green}` }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 200, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ fontFamily: t.serif, fontSize: 22, fontWeight: 700, letterSpacing: 0.3 }}>Tufts</span>
            <span style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,.45)" }} />
            <span style={{ fontFamily: t.serif, fontSize: 11.5, lineHeight: 1.25, color: "#e6eef7" }}>
              Gerald J. and Dorothy R.<br />Friedman School of<br />Nutrition Science and Policy
            </span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontFamily: t.serif, fontSize: 21, letterSpacing: 0.2 }}>Master of Science Degree Planner</div>
          <div style={{ fontSize: 12, color: "#d6e3f0", letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 600 }}>Map your courses · see if you're on track · share with your advisor</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {screen !== "setup" && <button onClick={() => setScreen("setup")} style={ghostBtn}>Start over</button>}
          <button onClick={() => setScreen(screen === "advisor" ? "setup" : "advisor")} style={ghostBtn}>
            <Users size={15} style={{ marginRight: 6, verticalAlign: -2 }} />Advisor view
          </button>
        </div>
      </div>
    </div>
  );
}
const ghostBtn = { background: "rgba(255,255,255,.12)", color: "#fff", border: "1px solid rgba(255,255,255,.28)", padding: "7px 12px", borderRadius: 7, fontSize: 13, cursor: "pointer" };

/* ---------------------------------- Setup ---------------------------------- */
function Setup(props) {
  const { program, setProgram, name, setName, passcode, setPasscode, startTerm, setStartTerm, startYear, setStartYear, intl, setIntl, specs, setSpecs, specOptions, specLimit, beginPlanning, loadPlan, loadMsg } = props;
  function toggleSpec(s) { setSpecs((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s])); }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 20, paddingTop: 26 }}>
      <div style={{ ...panel, padding: 0, overflow: "hidden" }}>
        <div style={bannerBlue}>Let's set up your plan</div>
        <div style={{ padding: 18 }}>
          <p style={{ color: t.slate, fontSize: 14, marginTop: 0 }}>A few questions first. Everything is editable later.</p>
          <Field label="Which program are you in?">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[["online", "Online MS", "30 credits · 10 courses"], ["campus", "On-campus MS", "48 credits · 16 courses"]].map(([val, title, sub]) => (
                <button key={val} onClick={() => { setProgram(val); setSpecs([]); }} style={{ ...choiceCard, borderColor: program === val ? t.navy : t.line, boxShadow: program === val ? `0 0 0 2px ${t.navy}` : "none" }}>
                  <div style={{ fontFamily: t.serif, fontSize: 17 }}>{title}</div>
                  <div style={{ fontSize: 12.5, color: t.slate }}>{sub}</div>
                </button>
              ))}
            </div>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
            <Field label="Your name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="First Last" style={input} /></Field>
            <Field label="Starting term">
              <div style={{ display: "flex", gap: 8 }}>
                <select value={startTerm} onChange={(e) => setStartTerm(e.target.value)} style={{ ...input, flex: 1 }}>
                  {["Fall", "Spring", "Summer"].map((x) => <option key={x}>{x}</option>)}
                </select>
                <input value={startYear} onChange={(e) => setStartYear(e.target.value)} style={{ ...input, width: 88 }} />
              </div>
            </Field>
          </div>
          {program === "campus" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: t.slate, marginTop: 4 }}>
              <input type="checkbox" checked={intl} onChange={(e) => setIntl(e.target.checked)} />
              I'm an international student (adds the 12-credit online-course cap)
            </label>
          )}
          <Field label={`Specializations — choose at least ${specLimit === 1 ? "one" : "two"} (you can add more if you'd like)`}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {specOptions.map((s) => (
                <button key={s} onClick={() => toggleSpec(s)} style={{ ...chip, background: specs.includes(s) ? t.navy : "#fff", color: specs.includes(s) ? "#fff" : t.ink, borderColor: specs.includes(s) ? t.navy : t.line }}>{s}</button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: t.faint, marginTop: 8 }}>
              {specs.length ? `${specs.length} selected` : "None yet"} · minimum {specLimit === 1 ? "1" : "2"} for the {program === "online" ? "Online" : "on-campus"} MS. You can change this on the next screen — not sure yet? Skip it and pick later.
            </p>
          </Field>
          <button onClick={beginPlanning} style={primaryBtn}>Build my plan →</button>
        </div>
      </div>
      <div style={{ ...panel, padding: 0, overflow: "hidden", background: "#fbfaf7" }}>
        <div style={bannerGreen}><FolderOpen size={16} style={{ verticalAlign: -3, marginRight: 8 }} />Coming back to a saved plan?</div>
        <div style={{ padding: 18 }}>
          <p style={{ color: t.slate, fontSize: 13.5, marginTop: 0 }}>Enter the same name and passcode you saved with.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <Field label="Name" style={{ flex: 1, minWidth: 160 }}><input value={name} onChange={(e) => setName(e.target.value)} style={input} /></Field>
            <Field label="Passcode" style={{ flex: 1, minWidth: 140 }}><PassInput value={passcode} onChange={(e) => setPasscode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadPlan()} /></Field>
            <button onClick={loadPlan} style={{ ...primaryBtn, marginTop: 0, width: "auto", padding: "10px 18px" }}>Load</button>
          </div>
          {loadMsg && <p style={{ fontSize: 13, color: t.bad, marginTop: 8 }}>{loadMsg}</p>}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------- Plan ---------------------------------- */
/* While a course is being dragged, scroll the page when the pointer nears the
   top or bottom edge, so far-away terms are reachable without zooming out. */
function useDragAutoScroll(active) {
  useEffect(() => {
    if (!active) return undefined;
    let y = null, raf = 0;
    const EDGE = 90, MAX = 18;
    const onOver = (e) => { y = e.clientY; };
    const tick = () => {
      if (y != null) {
        const h = window.innerHeight;
        let dy = 0;
        if (y > h - EDGE) dy = Math.ceil((Math.min(EDGE, y - (h - EDGE)) / EDGE) * MAX);
        else if (y < EDGE) dy = -Math.ceil((Math.min(EDGE, EDGE - y) / EDGE) * MAX);
        if (dy) window.scrollBy(0, dy);
      }
      raf = requestAnimationFrame(tick);
    };
    document.addEventListener("dragover", onOver);
    raf = requestAnimationFrame(tick);
    return () => { document.removeEventListener("dragover", onOver); cancelAnimationFrame(raf); };
  }, [active]);
}

function Plan(props) {
  const { program, name, setName, passcode, setPasscode, passcode2, setPasscode2, comments, setComments, specs, setSpecs, specOptions, specLimit, creditTarget, semesters, setSemesters, placed, setPlaced, placedCodes, addToSemester, removeFromPlan, dragCode, activeSem, setActiveSem, analysis, expEntries, setExpEntries, expHours, expDone, thesis, setThesis, priorCourses, setPriorCourses, wishlist, setWishlist, toggleWish, togglePrereqCheck, savePlan, mailtoHref, downloadPlan } = props;

  const [q, setQ] = useState("");
  const [modeFilter, setModeFilter] = useState("all");
  const [famFilter, setFamFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const [specFilter, setSpecFilter] = useState("all");
  const [coreFilter, setCoreFilter] = useState("all");
  const [showCustom, setShowCustom] = useState(false);
  const [dragItem, setDragItem] = useState(null);
  useDragAutoScroll(!!dragItem);

  const wishCodes = useMemo(() => new Set(wishlist.map((w) => w.code)), [wishlist]);

  // all codes tied to a specialization, across both programs, plus equivalents
  function specCodeSet(specName) {
    const s = new Set();
    const add = (r) => {
      if (!r) return;
      (r.pool || []).forEach((x) => s.add(x));
      (r.required || []).forEach((x) => s.add(x));
      (r.anyOf || []).forEach((g) => g.forEach((x) => s.add(x)));
    };
    add(SPEC_REQS[specName]); add(ONLINE_SPEC_REQS[specName]);
    Array.from(s).forEach((c) => equivOf(c).forEach((x) => s.add(x)));
    return s;
  }

  const catalog = useMemo(() => {
    const ql = q.toLowerCase();
    const specSet = specFilter === "all" ? null : specCodeSet(specFilter);
    return CATALOG_CLEAN.filter((c) => !placedCodes.has(c.code))
      .filter((c) => modeFilter === "all" || (modeFilter === "inperson" ? c.mode === "campus" || c.mode === "both" : c.mode === "online" || c.mode === "both"))
      .filter((c) => famFilter === "all" || c.fam === famFilter)
      .filter((c) => termFilter === "all" || (c.terms || []).includes(termFilter))
      .filter((c) => coreFilter === "all" || (c.fulfills || []).includes(coreFilter))
      .filter((c) => !specSet || specSet.has(c.code))
      .filter((c) => !ql || c.code.toLowerCase().includes(ql) || c.title.toLowerCase().includes(ql))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [q, modeFilter, famFilter, termFilter, specFilter, coreFilter, placedCodes]);

  function startDrag(c, e) {
    dragCode.current = c; setDragItem(c);
    try { if (e && e.dataTransfer) { e.dataTransfer.setData("text/plain", itemCode(c)); e.dataTransfer.effectAllowed = "move"; } } catch (err) {}
  }
  function endDrag() { dragCode.current = null; setDragItem(null); }
  function onDropTo(sid, e) { if (e) e.preventDefault(); if (dragCode.current) addToSemester(dragCode.current, sid); endDrag(); }
  function addSemester() {
    const last = semesters[semesters.length - 1];
    const ti = (TERM_ORDER.indexOf(last.term) + 1) % 3;
    const yr = ti === 0 ? last.year + 1 : last.year;
    const id = `${TERM_ORDER[ti]}-${yr}`;
    setSemesters([...semesters, { id, term: TERM_ORDER[ti], year: yr }]);
    setPlaced((p) => ({ ...p, [id]: [] }));
  }

  return (
    <div style={{ paddingTop: 20 }}>
      <ProgressBar analysis={analysis} creditTarget={creditTarget} expHours={expHours} expDone={expDone} thesis={thesis} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.55fr) minmax(260px, 0.95fr)", gap: 18, alignItems: "start" }} className="planGrid">
        <div>
          {/* catalog */}
          <div style={{ ...panel, padding: 14 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: t.faint }} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses (e.g. 250, epidemiology)" style={{ ...input, paddingLeft: 30 }} />
              </div>
              <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} style={{ ...input, width: "auto", minWidth: 130 }}>
                <option value="all">All modalities</option>
                <option value="online">Online / hybrid</option>
                <option value="inperson">In-person / hybrid</option>
              </select>
              <select value={famFilter} onChange={(e) => setFamFilter(e.target.value)} style={{ ...input, width: "auto", minWidth: 118 }}>
                <option value="all">All prefixes</option>
                <option value="R">NUTR</option>
                <option value="ON">NUTR ON</option>
                <option value="B">NUTB</option>
                <option value="C">NUTC</option>
                <option value="X">Other (BCHM…)</option>
              </select>
              <select value={termFilter} onChange={(e) => setTermFilter(e.target.value)} style={{ ...input, width: "auto", minWidth: 120 }}>
                <option value="all">All terms</option>
                <option value="Fall">Offered in Fall</option>
                <option value="Spring">Offered in Spring</option>
                <option value="Summer">Offered in Summer</option>
              </select>
              <select value={coreFilter} onChange={(e) => setCoreFilter(e.target.value)} style={{ ...input, width: "auto", minWidth: 150 }}>
                <option value="all">All core areas</option>
                <option value="nutsci">Nutrition science core</option>
                <option value="quant">Quantitative reasoning core</option>
                <option value="policy">Policy &amp; programs core</option>
              </select>
              <select value={specFilter} onChange={(e) => setSpecFilter(e.target.value)} style={{ ...input, width: "auto", minWidth: 170, maxWidth: 240 }}>
                <option value="all">All specializations</option>
                {ALL_SPECS.filter((s) => s !== "Build Your Own").map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {coreFilter !== "all" && (
              <p style={{ fontSize: 11.5, color: t.slate, marginTop: 8 }}>
                Showing courses that fulfill the <b>{coreFilter === "nutsci" ? "nutrition science" : coreFilter === "quant" ? "quantitative reasoning" : "policy & programs"}</b> core. Nutrition science and policy each have equivalent options — take the one your specialization points to.
              </p>
            )}
            {specFilter !== "all" && (
              <p style={{ fontSize: 11.5, color: t.slate, marginTop: 8 }}>
                Showing courses associated with <b>{specFilter}</b> — the required, choose-one, and online-pool courses for that area across both the online and on-campus MS.
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, maxHeight: 250, overflowY: "auto", paddingRight: 4 }}>
              {catalog.map((c) => (
                <CourseChip key={c.code} c={c} onDragStart={(e) => startDrag(c, e)} onDragEnd={endDrag}
                  onClick={() => { if (activeSem) addToSemester(c, activeSem); }} clickable={!!activeSem}
                  wished={wishCodes.has(c.code)} onToggleWish={() => toggleWish(c.code)} />
              ))}
              {!catalog.length && <div style={{ color: t.faint, fontSize: 13, padding: 8 }}>No matches. Try a different search, or add a custom course below.</div>}
            </div>
            <button onClick={() => setShowCustom((s) => !s)} style={{ ...linkBtn, marginTop: 8 }}><Plus size={13} style={{ verticalAlign: -2 }} /> Add a course that isn't listed</button>
            {showCustom && <CustomCourse semesters={semesters} setPlaced={setPlaced} specs={specs} />}
            <p style={{ fontSize: 11.5, color: t.faint, marginTop: 10 }}>
              {activeSem
                ? "Tap a course to drop it into the highlighted term below — or drag it."
                : "Drag a course into a term below (the page scrolls when you drag near the edge), or tap a term to make it active, then tap courses to add them. Tap ☆ to save a course to your wish list."}
            </p>
          </div>

          {/* semesters */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 12, marginTop: 14 }}>
            {semesters.map((s) => {
              const arr = (placed[s.id] || []).map(resolveCourse);
              const cr = arr.reduce((a, c) => a + (c.cr || 0), 0);
              const semConflicts = analysis.conflicts.filter((c) => c.sid === s.id);
              const semTermWarn = analysis.termWarnings.filter((w) => w.sid === s.id);
              const isActive = activeSem === s.id;
              const dragObj = dragItem ? resolveCourse(dragItem) : null;
              const dragOffered = dragObj && (!dragObj.terms || !dragObj.terms.length || dragObj.terms.includes(s.term));
              const dragInvalid = dragObj && !dragOffered;
              const borderCol = dragInvalid ? t.bad : dragOffered ? t.green : isActive ? t.navy : t.line;
              const bg = dragInvalid ? t.badBg : dragOffered ? t.metBg : "#fff";
              return (
                <div key={s.id}
                  onDragOver={(e) => { if (!dragInvalid) e.preventDefault(); }} onDrop={(e) => onDropTo(s.id, e)}
                  onClick={() => setActiveSem(isActive ? null : s.id)}
                  style={{ background: bg, border: `1.5px solid ${borderCol}`, borderRadius: 10, padding: 10, minHeight: 120, cursor: "pointer", boxShadow: isActive && !dragObj ? `0 0 0 2px ${t.navy}22` : "none", transition: "background .15s, border-color .15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontFamily: t.serif, fontSize: 15.5 }}>{s.term} {s.year}</div>
                    <div style={{ fontSize: 12, color: cr > 0 ? t.slate : t.faint }}>{cr} cr</div>
                  </div>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {arr.map((c) => (
                      <PlacedCard key={c.code} c={c} term={s.term} semesters={semesters} curSid={s.id}
                        onMove={(to) => addToSemester(c.custom ? c : c.code, to)} onRemove={() => removeFromPlan(c.code)}
                        conflict={semConflicts.some((x) => x.a === c.code || x.b === c.code)}
                        offTerm={semTermWarn.some((w) => w.code === c.code)}
                        pre={analysis.prereqs.find((p) => p.code === c.code && p.sid === s.id)}
                        onTogglePre={(k) => togglePrereqCheck(c.code, k)}
                        onDragStart={(e) => startDrag(c.custom ? c : c.code, e)} onDragEnd={endDrag} />
                    ))}
                    {!arr.length && (
                      <div style={{ fontSize: 12, color: dragInvalid ? t.bad : t.faint, padding: "10px 4px", textAlign: "center", border: `1px dashed ${dragInvalid ? t.bad : dragOffered ? t.green : t.line}`, borderRadius: 7 }}>
                        {dragInvalid ? `Not offered in ${s.term}` : dragOffered ? `Drop into ${s.term}` : isActive ? "Active — tap courses above" : "Drop courses here"}
                      </div>
                    )}
                  </div>
                  {semConflicts.map((c, i) => (
                    <div key={i} style={{ marginTop: 8, fontSize: 11.5, color: t.bad, background: t.badBg, borderRadius: 6, padding: "6px 8px" }}>
                      <AlertTriangle size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{c.a} & {c.b} overlap ({c.when})
                    </div>
                  ))}
                  {semTermWarn.map((w, i) => (
                    <div key={"tw" + i} style={{ marginTop: 8, fontSize: 11.5, color: t.attn, background: t.attnBg, borderRadius: 6, padding: "6px 8px" }}>
                      <AlertTriangle size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{w.code} isn't offered in {w.term} (runs {w.offered.join(" / ")})
                    </div>
                  ))}
                </div>
              );
            })}
            <button onClick={addSemester} style={{ border: `1px dashed ${t.line}`, background: "#fbfaf7", borderRadius: 10, minHeight: 120, color: t.slate, cursor: "pointer", fontSize: 13 }}>
              <Plus size={16} style={{ verticalAlign: -3 }} /> Add a term
            </button>
          </div>

          <WishList wishlist={wishlist} setWishlist={setWishlist} placed={placed} semesters={semesters}
            analysis={analysis} creditTarget={creditTarget} activeSem={activeSem} addToSemester={addToSemester}
            onDragStart={(code, e) => startDrag(code, e)} onDragEnd={endDrag} />

          <PriorCourses priorCourses={priorCourses} setPriorCourses={setPriorCourses} specs={specs} />
        </div>

        {/* RIGHT: requirements + actions */}
        <div style={{ position: "sticky", top: 12, display: "flex", flexDirection: "column", gap: 14 }}>
          <Requirements analysis={analysis} program={program} specs={specs} setSpecs={setSpecs} specOptions={specOptions} specLimit={specLimit} intl={props.intl}
            expEntries={expEntries} setExpEntries={setExpEntries} expHours={expHours} expDone={expDone} thesis={thesis} setThesis={setThesis} semesters={semesters} />

          <div style={panel}>
            <h3 style={{ ...h2, fontSize: 15.5 }}><Mail size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Share your plan</h3>
            <p style={{ fontSize: 12.5, color: t.slate, marginTop: 0 }}>Comments you type here are saved with your plan and included in the email, the Word download, and your advisor's view.</p>
            <Field label="Comments / requests for your advisor" style={{ margin: "0 0 4px" }}>
              <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} placeholder="Questions, requests, or context for your advisor…" style={{ ...input, resize: "vertical", fontFamily: "inherit", lineHeight: 1.45 }} />
            </Field>
            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <a href={mailtoHref()} style={{ ...primaryBtn, marginTop: 0, flex: 1, minWidth: 130, padding: "10px", textAlign: "center", textDecoration: "none", display: "inline-block" }}>
                <Mail size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Email my plan
              </a>
              <button onClick={downloadPlan} style={{ ...secondaryBtn, flex: 1, minWidth: 110 }}>
                <Save size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Download (Word)
              </button>
            </div>
            <p style={{ fontSize: 11, color: t.faint, marginTop: 8 }}>If the email button doesn't open your mail app, download the Word copy and attach it to an email instead.</p>
          </div>

          <div style={panel}>
            <h3 style={{ ...h2, fontSize: 15.5 }}><Save size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Save to come back later</h3>
            <p style={{ fontSize: 12.5, color: t.slate, marginTop: 0 }}>Choose a name and passcode. You'll re-enter both on the first screen to reload this plan.</p>
            <div style={{ display: "grid", gap: 8 }}>
              <Field label="Your name" style={{ margin: 0 }}><input value={name} onChange={(e) => setName(e.target.value)} placeholder="First Last" style={input} /></Field>
              <Field label="Passcode (pick anything you'll remember)" style={{ margin: 0 }}><PassInput value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="e.g. maple-123" /></Field>
              <Field label="Re-enter passcode" style={{ margin: 0 }}><PassInput value={passcode2} onChange={(e) => setPasscode2(e.target.value)} placeholder="type it again" /></Field>
              {passcode && passcode2 && passcode !== passcode2 && <p style={{ color: t.bad, fontSize: 12, margin: 0 }}>Passcodes don't match yet.</p>}
              <button onClick={savePlan} style={{ ...primaryBtn, marginTop: 2, padding: "10px" }}><Save size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Save plan</button>
            </div>
            <p style={{ fontSize: 11.5, color: t.slate, marginTop: 10, lineHeight: 1.5 }}>
              {SYNC_URL
                ? "Plans save to a shared class server: reload from any device with your name + passcode, and your advisor can see them. Pick a simple passcode — never reuse a real password. This is not a secure portal, so don't include sensitive information."
                : "Right now plans save only in this browser on this device, and the advisor view only sees plans saved here. Email or download your plan to share it. Don't include sensitive information — this is not a secure portal."}
            </p>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 11.5, color: t.faint, marginTop: 22, lineHeight: 1.5 }}>
        This planner is a guide, not an official degree audit. Course requirements, schedules, and prerequisites were transcribed from Friedman viewbooks, course lists, and the registrar's prerequisite page and can change — confirm this plan with course availability in SIS when registering. Course offerings will change over time, so revisit and update this plan every year in case new courses are added or semester changes affect your plan.
      </p>
      <style>{`@media (max-width: 860px){ .planGrid{ grid-template-columns: minmax(0,1fr) !important; } }`}</style>
    </div>
  );
}

/* ------------------------------- sub-widgets ------------------------------- */
function CourseChip({ c, onDragStart, onDragEnd, onClick, clickable, wished, onToggleWish }) {
  const terms = (c.terms || []).join(" / ");
  const pre = PREREQS[c.code];
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      title={c.title + (terms ? " · offered " + terms : "") + (c.note ? " · " + c.note : "") + (pre ? ` · ${pre.recommended ? "Recommended" : "Prerequisite"}: ${pre.official}` : "")}
      style={{ border: `1px solid ${t.line}`, borderLeft: `3px solid ${familyColor[c.fam]}`, borderRadius: 7, padding: "6px 9px", background: "#fff", cursor: clickable ? "pointer" : "grab", maxWidth: 260 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "baseline" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.code} <span style={{ fontWeight: 400, color: t.faint }}>· {c.cr} cr</span></div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {terms && <div style={{ fontSize: 9.5, color: t.blue, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase", whiteSpace: "nowrap" }}>{terms}</div>}
          {onToggleWish && (
            <button onClick={(e) => { e.stopPropagation(); onToggleWish(); }} title={wished ? "Remove from wish list" : "Add to wish list"} aria-label={wished ? "Remove from wish list" : "Add to wish list"}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0, color: wished ? t.brass : t.faint }}>
              <Star size={13} fill={wished ? t.brass : "none"} />
            </button>
          )}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: t.slate, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }}>
        {pre && !pre.recommended && <span style={{ fontSize: 9.5, fontWeight: 600, color: t.attn, textTransform: "uppercase", letterSpacing: 0.3, marginRight: 5 }}>prereq</span>}
        {c.title}
      </div>
    </div>
  );
}

/* Prerequisite checklist inside a placed course card */
function PrereqBlock({ pre, semesters, onToggle }) {
  const [open, setOpen] = useState(false);
  if (!pre) return null;
  const flagged = pre.unmet > 0;
  const col = pre.recommended ? t.faint : flagged ? t.attn : t.met;
  const summary = pre.recommended ? "recommended background" : flagged ? `prerequisite${pre.unmet > 1 ? "s" : ""} to check (${pre.unmet})` : "prerequisites met";
  return (
    <div style={{ marginTop: 4 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 10.5, color: col, fontWeight: 600 }}>
        {flagged ? <AlertTriangle size={10} style={{ verticalAlign: -1, marginRight: 3 }} /> : pre.recommended ? <Info size={10} style={{ verticalAlign: -1, marginRight: 3 }} /> : <CheckCircle2 size={10} style={{ verticalAlign: -1, marginRight: 3 }} />}
        {summary} {open ? "▴" : "▾"}
      </button>
      {open && (
        <div style={{ marginTop: 4, padding: "6px 7px", background: "#fbfaf7", border: `1px solid ${t.lineSoft}`, borderRadius: 6 }}>
          <div style={{ fontSize: 10.5, color: t.slate, marginBottom: 4 }}>{pre.official}</div>
          {pre.items.map((it, k) => {
            const auto = it.status === "planned";
            const note = it.note ? (it.status === "planned" ? `${it.note}, ${semLabel(semesters, it.where)}` : it.note)
              : it.status === "planned" ? `planned ${semLabel(semesters, it.where)}`
              : it.status === "late" ? `planned ${semLabel(semesters, it.where)} — needs an earlier term`
              : it.status === "missing" ? "not in your plan" : it.status === "confirm" ? "check off if you have this" : "checked off";
            const noteCol = it.status === "late" || it.status === "missing" ? t.attn : t.faint;
            return (
              <label key={k} style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 11, color: t.ink, padding: "2px 0", cursor: auto ? "default" : "pointer" }}>
                <input type="checkbox" checked={auto || it.status === "checked"} disabled={auto} onChange={() => onToggle(k)} style={{ marginTop: 2 }} />
                <span>{it.label} <span style={{ color: noteCol }}>· {note}</span></span>
              </label>
            );
          })}
          {!pre.recommended && <div style={{ fontSize: 10, color: t.faint, marginTop: 3 }}>Check an item if you've met it another way (equivalent or pre-Friedman course, or instructor consent).</div>}
        </div>
      )}
    </div>
  );
}

function PlacedCard({ c, term, semesters, curSid, onMove, onRemove, conflict, offTerm, pre, onTogglePre, onDragStart, onDragEnd }) {
  const [openMove, setOpenMove] = useState(false);
  const bk = (c.meetings && c.meetings[term]) || [];
  const preFlag = pre && pre.unmet > 0;
  const flag = conflict ? t.bad : offTerm || preFlag ? t.attn : null;
  const flagBg = conflict ? t.badBg : offTerm ? t.attnBg : "#fff";
  return (
    <div draggable onDragStart={(e) => { e.stopPropagation(); onDragStart(e); }} onDragEnd={onDragEnd} onClick={(e) => e.stopPropagation()}
      style={{ border: `1px solid ${flag || t.line}`, borderLeft: `3px solid ${familyColor[c.fam]}`, borderRadius: 7, padding: "7px 8px", background: flagBg }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.code} <span style={{ fontWeight: 400, color: t.faint }}>· {c.cr}cr</span></div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setOpenMove((s) => !s)} title="Move to another term" style={iconBtn}><ArrowRightLeft size={12} /></button>
          <button onClick={onRemove} title="Remove" style={iconBtn}><X size={12} /></button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: t.slate, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
      {c.approved && <div style={{ fontSize: 10, color: t.green, marginTop: 2, fontWeight: 600 }}>✓ approved · {labelForCounts(c.satisfies, []) === "general elective" ? "elective" : shortCounts(c.satisfies)}</div>}
      {bk.length > 0 && <div style={{ fontSize: 10.5, color: t.faint, marginTop: 2 }}><Clock size={9} style={{ verticalAlign: -1 }} /> {bk.map(fmtBlock).join(" · ")}</div>}
      <PrereqBlock pre={pre} semesters={semesters} onToggle={onTogglePre} />
      {openMove && (
        <select autoFocus onChange={(e) => { onMove(e.target.value); setOpenMove(false); }} defaultValue={curSid} style={{ ...input, marginTop: 6, fontSize: 12, padding: "5px 6px" }}>
          {semesters.map((s) => <option key={s.id} value={s.id}>{s.term} {s.year}</option>)}
        </select>
      )}
    </div>
  );
}

function CustomCourse({ semesters, setPlaced, specs }) {
  const [code, setCode] = useState(""); const [title, setTitle] = useState(""); const [cr, setCr] = useState("3");
  const [sid, setSid] = useState(semesters[0]?.id || "");
  const [approved, setApproved] = useState(false);
  const [counts, setCounts] = useState("elective");
  function add() {
    if (!code.trim()) return;
    const obj = { code: code.trim(), title: title.trim() || code.trim(), cr: Number(cr) || 0, fam: familyOf(code), terms: [], fulfills: [], meetings: {}, custom: true, approved, satisfies: approved ? counts : null };
    setPlaced((p) => ({ ...p, [sid]: [...(p[sid] || []), obj] }));
    setCode(""); setTitle(""); setCr("3"); setApproved(false); setCounts("elective");
  }
  return (
    <div style={{ marginTop: 8, padding: 10, border: `1px solid ${t.line}`, borderRadius: 8, background: "#fbfaf7", display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (e.g. UEP 293)" style={{ ...input, flex: 1, minWidth: 110 }} />
        <input value={cr} onChange={(e) => setCr(e.target.value)} placeholder="cr" style={{ ...input, width: 60 }} />
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" style={input} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: t.slate }}>
        <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
        Advisor-approved to count toward a core or specialization requirement
      </label>
      {approved && (
        <select value={counts} onChange={(e) => setCounts(e.target.value)} style={{ ...input, fontSize: 13 }}>
          {countsOptions(specs).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <select value={sid} onChange={(e) => setSid(e.target.value)} style={{ ...input, flex: 1 }}>{semesters.map((s) => <option key={s.id} value={s.id}>{s.term} {s.year}</option>)}</select>
        <button onClick={add} style={{ ...secondaryBtn, width: "auto", padding: "8px 14px" }}>Add</button>
      </div>
    </div>
  );
}

/* Elective wish list: courses the student is considering but hasn't committed to.
   Items are { code, note } for catalog courses, or { code, note, course } for a
   course from another Tufts school entered by hand (course = custom course object). */
const TUFTS_SCHOOLS = [
  "School of Arts and Sciences", "School of Engineering", "The Fletcher School",
  "School of Medicine (Public Health & Professional Degree Programs)", "Cummings School of Veterinary Medicine",
  "School of Dental Medicine", "Graduate School of Biomedical Sciences", "SMFA at Tufts", "Tisch College of Civic Life",
];
const wishCourse = (w) => w.course || resolveCourse(w.code);

function OtherSchoolForm({ wishlist, setWishlist, onDone }) {
  const [school, setSchool] = useState(""); const [code, setCode] = useState(""); const [title, setTitle] = useState("");
  const [cr, setCr] = useState("3"); const [terms, setTerms] = useState([]); const [note, setNote] = useState(""); const [err, setErr] = useState("");
  function toggleTerm(x) { setTerms((cur) => (cur.includes(x) ? cur.filter((y) => y !== x) : [...cur, x])); }
  function save() {
    const cd = code.trim() || title.trim();
    if (!cd) { setErr("Enter a course number or a title."); return; }
    if (CAT_BY_CODE[cd]) { setErr(`${cd} is already in the Friedman catalog — tap its ☆ above instead.`); return; }
    if (wishlist.some((w) => w.code === cd)) { setErr(`${cd} is already on your wish list.`); return; }
    const course = {
      code: cd, title: title.trim() || cd, cr: Number(cr) || 0, fam: "X", terms: TERM_ORDER.filter((x) => terms.includes(x)),
      fulfills: [], meetings: {}, custom: true, approved: false, satisfies: null, school: school.trim(),
    };
    setWishlist((cur) => [...cur, { code: cd, note: note.trim(), course }]);
    setSchool(""); setCode(""); setTitle(""); setCr("3"); setTerms([]); setNote(""); setErr("");
    onDone();
  }
  return (
    <div style={{ marginTop: 10, padding: 10, border: `1px solid ${t.line}`, borderRadius: 8, background: "#fbfaf7", display: "grid", gap: 6 }}>
      <input value={school} onChange={(e) => setSchool(e.target.value)} list="tufts-schools" placeholder="School (e.g. The Fletcher School)" style={input} />
      <datalist id="tufts-schools">{TUFTS_SCHOOLS.map((x) => <option key={x} value={x} />)}</datalist>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Course number (e.g. DHP P207)" style={{ ...input, flex: 1, minWidth: 140 }} />
        <input value={cr} onChange={(e) => setCr(e.target.value)} placeholder="cr" title="Credits" style={{ ...input, width: 60 }} />
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course title" style={input} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", fontSize: 12.5, color: t.slate }}>
        Offered (if known):
        {["Fall", "Spring", "Summer"].map((x) => (
          <label key={x} style={{ display: "flex", gap: 4, alignItems: "center" }}><input type="checkbox" checked={terms.includes(x)} onChange={() => toggleTerm(x)} />{x}</label>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to self" style={input} />
      {err && <div style={{ fontSize: 12, color: t.bad }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={save} style={{ ...secondaryBtn, width: "auto", padding: "8px 14px" }}><Star size={13} style={{ verticalAlign: -2, marginRight: 6 }} />Save to wish list</button>
        <span style={{ fontSize: 11, color: t.faint }}>Cross-registered courses need advisor approval to count toward your degree.</span>
      </div>
    </div>
  );
}

function WishList({ wishlist, setWishlist, placed, semesters, analysis, creditTarget, activeSem, addToSemester, onDragStart, onDragEnd }) {
  const [showForm, setShowForm] = useState(false);
  const whereOf = {};
  Object.entries(placed || {}).forEach(([sid, arr]) => (arr || []).forEach((it) => { whereOf[itemCode(it)] = sid; }));
  const remaining = Math.max(0, creditTarget - analysis.totalCr);
  function update(code, patch) { setWishlist((cur) => cur.map((w) => (w.code === code ? { ...w, ...patch } : w))); }
  function remove(code) { setWishlist((cur) => cur.filter((w) => w.code !== code)); }
  return (
    <div style={{ ...panel, padding: 0, overflow: "hidden", marginTop: 14 }}>
      <div style={{ ...bannerBase, background: t.brass }}><Star size={15} style={{ verticalAlign: -2, marginRight: 8 }} />Elective wish list</div>
      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 12.5, color: t.slate, marginTop: 0 }}>
          Tap ☆ on any course above to save it here and decide later. You can leave a note about each course.
          {" "}{remaining > 0 ? <b style={{ color: t.ink }}>You have {remaining} credit{remaining === 1 ? "" : "s"} left to fill.</b> : <b style={{ color: t.met }}>Your planned credits already meet the target.</b>}
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {wishlist.map((w) => {
            const c = wishCourse(w);
            const item = w.course || w.code;
            const sid = whereOf[w.code];
            const pre = PREREQS[w.code];
            return (
              <div key={w.code} draggable={!sid} onDragStart={(e) => onDragStart(item, e)} onDragEnd={onDragEnd}
                onClick={() => { if (!sid && activeSem) addToSemester(item, activeSem); }}
                style={{ border: `1px solid ${t.line}`, borderLeft: `3px solid ${familyColor[c.fam] || t.line}`, borderRadius: 8, padding: "8px 10px", background: sid ? "#f7faf8" : "#fff", cursor: sid ? "default" : activeSem ? "pointer" : "grab", display: "grid", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.code} {c.title !== c.code && <span style={{ fontWeight: 400, color: t.slate }}>— {c.title}</span>} <span style={{ fontWeight: 400, color: t.faint }}>· {c.cr} cr</span></div>
                  <button onClick={(e) => { e.stopPropagation(); remove(w.code); }} title="Remove from wish list" style={iconBtn}><X size={12} /></button>
                </div>
                <div style={{ fontSize: 11, color: t.faint }}>
                  {w.course ? <span style={{ color: t.brass, fontWeight: 600 }}>{c.school || "Other Tufts school"} · </span> : null}
                  {(c.terms || []).length ? `Offered ${c.terms.join(" / ")}` : w.course ? "Terms not entered" : ""}{c.mode ? ` · ${c.mode === "both" ? "online or in person" : c.mode === "campus" ? "in person" : "online"}` : ""}
                  {pre && !pre.recommended ? <span style={{ color: t.attn }}> · prereq: {pre.official}</span> : null}
                </div>
                {sid ? <div style={{ fontSize: 11, color: t.met, fontWeight: 600 }}>✓ In your plan: {semLabel(semesters, sid)}</div> : null}
                <input value={w.note || ""} onClick={(e) => e.stopPropagation()} onChange={(e) => update(w.code, { note: e.target.value })} placeholder="Note to self" style={{ ...input, padding: "5px 8px", fontSize: 12.5 }} />
              </div>
            );
          })}
        </div>
        {!wishlist.length && <p style={{ fontSize: 11.5, color: t.faint, marginBottom: 0 }}>Nothing saved yet.</p>}
        <button onClick={() => setShowForm((x) => !x)} style={{ ...linkBtn, marginTop: 10 }}><Plus size={13} style={{ verticalAlign: -2 }} /> Save a course from another Tufts school</button>
        {showForm && <OtherSchoolForm wishlist={wishlist} setWishlist={setWishlist} onDone={() => setShowForm(false)} />}
      </div>
    </div>
  );
}

function ProgressBar({ analysis, creditTarget, expHours, expDone, thesis }) {
  const pct = Math.min(100, Math.round((analysis.totalCr / creditTarget) * 100));
  const coreCount = [analysis.nutsci, analysis.quant, analysis.policy].filter(Boolean).length;
  const nTerm = analysis.termWarnings.length;
  const nPre = analysis.prereqFlags.length;
  const elMet = thesis || expHours >= EL_HOURS;
  return (
    <div style={{ ...panel, padding: 0, marginBottom: 16, overflow: "hidden" }}>
      <div style={bannerBlue}>Your degree progress</div>
      <div style={{ padding: "14px 18px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontFamily: t.serif, fontSize: 22, color: t.ink }}>{analysis.totalCr} <span style={{ fontSize: 15, color: t.slate }}>of {creditTarget} planned credits</span></div>
          <div style={{ display: "flex", gap: 16, fontSize: 13, color: t.slate, flexWrap: "wrap" }}>
            <span>Core areas: <b style={{ color: coreCount === 3 ? t.met : t.ink }}>{coreCount}/3</b></span>
            <span>Experiential: <b style={{ color: elMet ? t.met : t.ink }}>{thesis ? "thesis ✓" : !expHours && !expDone ? "not logged yet" : `${expHours} hrs planned`}</b>{!thesis && expDone > 0 ? <span style={{ color: t.faint }}> ({expDone} done)</span> : null}</span>
            {analysis.conflicts.length > 0 && <span style={{ color: t.bad }}><AlertTriangle size={13} style={{ verticalAlign: -2 }} /> {analysis.conflicts.length} time conflict{analysis.conflicts.length > 1 ? "s" : ""}</span>}
            {nTerm > 0 && <span style={{ color: t.attn }}><AlertTriangle size={13} style={{ verticalAlign: -2 }} /> {nTerm} off-term course{nTerm > 1 ? "s" : ""}</span>}
            {nPre > 0 && <span style={{ color: t.attn }}><AlertTriangle size={13} style={{ verticalAlign: -2 }} /> {nPre} prerequisite{nPre > 1 ? "s" : ""} to check</span>}
          </div>
        </div>
        <div style={{ height: 10, background: t.lineSoft, borderRadius: 6, marginTop: 12, overflow: "hidden" }}>
          <div style={{ width: pct + "%", height: "100%", background: t.blueBright, transition: "width .3s" }} />
        </div>
      </div>
    </div>
  );
}

/* Two-tone bar: done hours (solid) inside planned hours (light), against 120 */
function ElBar({ planned, done }) {
  const pp = Math.min(100, (planned / EL_HOURS) * 100);
  const dp = Math.min(100, (done / EL_HOURS) * 100);
  return (
    <div style={{ position: "relative", height: 8, background: t.lineSoft, borderRadius: 5, overflow: "hidden", margin: "4px 0 8px" }}>
      <div style={{ position: "absolute", inset: 0, width: pp + "%", background: "#bfe0cb" }} />
      <div style={{ position: "absolute", inset: 0, width: dp + "%", background: t.green }} />
    </div>
  );
}

function Requirements({ analysis, program, specs, setSpecs, specOptions, specLimit, intl, expEntries, setExpEntries, expHours, expDone, thesis, setThesis, semesters }) {
  function toggleSpec(s) { setSpecs((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s])); }
  return (
    <div style={{ ...panel, padding: 0, overflow: "hidden" }}>
      <div style={bannerGreen}>On track?</div>
      <div style={{ padding: 18 }}>
        <ReqRow ok={analysis.nutsci} label="Nutrition science core" detail="NUTC/NUTR 202, or 245+246, or 370+371" />
        <ReqRow ok={analysis.quant} label="Quantitative reasoning core" detail={program === "online" ? "NUTB 250" : "NUTR 206 / 207 (per specialization)"} />
        <ReqRow ok={analysis.policy} label="Policy & programs core" detail={analysis.policyPair ? "met via ON222 + ON223" : "one policy course"} />

        <div style={{ borderTop: `1px solid ${t.lineSoft}`, margin: "12px 0 10px" }} />
        <div style={{ fontSize: 12.5, fontWeight: 600, color: t.slate, marginBottom: 6 }}>
          Specializations · {specs.length} chosen
          <span style={{ fontWeight: 400, color: specs.length >= specLimit ? t.met : t.faint }}> ({specs.length >= specLimit ? "minimum of " + specLimit + " met" : "minimum " + specLimit})</span>
        </div>
        <details style={{ marginBottom: 8 }}>
          <summary style={{ fontSize: 12.5, color: t.navy, cursor: "pointer" }}>change</summary>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {specOptions.map((s) => <button key={s} onClick={() => toggleSpec(s)} style={{ ...chip, fontSize: 11.5, padding: "4px 8px", background: specs.includes(s) ? t.navy : "#fff", color: specs.includes(s) ? "#fff" : t.ink, borderColor: specs.includes(s) ? t.navy : t.line }}>{s}</button>)}
          </div>
        </details>
        {!specs.length && <div style={{ fontSize: 12.5, color: t.faint, marginBottom: 8 }}>No specialization chosen yet.</div>}
        {analysis.specResults.map((r) => (
          <div key={r.name} style={{ marginBottom: 8 }}>
            {r.byo ? (
              <ReqRow neutral label={r.name} detail="Build Your Own — plan with your advisor" />
            ) : r.online ? (
              <div>
                <ReqRow ok={r.ok} label={r.name} detail={`${r.poolCr} cr in area (need ≥ 9)`} />
                {(r.subs || []).length > 0 && (
                  <div style={{ marginLeft: 26, marginTop: 2 }}>
                    {r.subs.map((s, i) => <div key={"os" + i} style={{ fontSize: 11, color: t.green }}>✓ {s.label} (advisor-approved{s.prior ? ", pre-Friedman" : ""})</div>)}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <ReqRow ok={r.ok} label={r.name} detail={`${r.have.length + (r.subs ? r.subs.length : 0)}/${(r.required || []).length} required courses`} />
                <div style={{ marginLeft: 26, marginTop: 2 }}>
                  {(r.required || []).map((rc) => <span key={rc} style={{ fontSize: 11, marginRight: 8, color: r.have.includes(rc) ? t.met : t.faint }}>{r.have.includes(rc) ? "✓" : "○"} {rc}</span>)}
                  {(r.anyGroups || []).map((g, i) => <div key={i} style={{ fontSize: 11, color: g.satisfied ? t.met : t.faint }}>{g.satisfied ? "✓" : "○"} one of: {g.group.join(" / ")}</div>)}
                  {(r.subs || []).map((s, i) => <div key={"s" + i} style={{ fontSize: 11, color: t.green }}>✓ {s.label} (advisor-approved{s.prior ? ", pre-Friedman" : ""})</div>)}
                </div>
              </div>
            )}
          </div>
        ))}

        <div style={{ borderTop: `1px solid ${t.lineSoft}`, margin: "10px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2, gap: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: t.slate }}>Experiential learning</div>
          <div style={{ fontSize: 12, color: thesis || expHours >= EL_HOURS ? t.met : t.slate, textAlign: "right" }}>{expSummary(thesis, expHours, expDone)}</div>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: t.ink, margin: "6px 0 8px" }}>
          <input type="checkbox" checked={thesis} onChange={(e) => setThesis(e.target.checked)} style={{ marginTop: 2 }} />
          <span><GraduationCap size={13} style={{ verticalAlign: -2, marginRight: 4 }} />I'm doing a master's thesis <span style={{ color: t.faint }}>(a thesis counts as your experiential learning — confirm with your advisor)</span></span>
        </label>
        {!thesis && (
          <>
            {(expHours > 0 || expDone > 0) && <ElBar planned={expHours} done={expDone} />}
            <ExpEditor expEntries={expEntries} setExpEntries={setExpEntries} />
          </>
        )}

        <div style={{ borderTop: `1px solid ${t.lineSoft}`, margin: "12px 0 8px" }} />
        {analysis.prereqFlags.length > 0 && (
          <FlagRow warnOnly label={`Prerequisites to check: ${analysis.prereqFlags.length}`} warn={analysis.prereqFlags.map((p) => `${p.code} (${semLabel(semesters, p.sid)})`).join(", ") + " — open the course card to review or check off."} />
        )}
        {program === "online" && (
          <>
            <FlagRow bad={analysis.inPersonCount > 2} label={`In-person Boston courses: ${analysis.inPersonCount} / 2`} good="within the 2-course limit" warn={`over the limit (${analysis.inPersonList.join(", ")}). Directed studies don't count.`} />
            <FlagRow bad={analysis.directedCr > 6} label={`Directed-study credits: ${analysis.directedCr} / 6`} good="within limit" warn="over the 6-credit online cap" />
          </>
        )}
        {program === "campus" && intl && <FlagRow bad={analysis.onlineCredits > 12} label={`Online credits: ${analysis.onlineCredits} / 12`} good="within the international-student cap" warn="over the 12-credit cap" />}
        {program === "campus" && <FlagRow bad={analysis.directedCr > 12} label={`Directed-study credits: ${analysis.directedCr} / 12`} good="within limit" warn="over the 12-credit cap" />}
      </div>
    </div>
  );
}
function ReqRow({ ok, neutral, label, detail }) {
  const color = neutral ? t.brass : ok ? t.met : t.attn;
  const Icon = neutral ? Info : ok ? CheckCircle2 : Circle;
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "3px 0" }}>
      <Icon size={17} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <div><div style={{ fontSize: 13.5 }}>{label}</div><div style={{ fontSize: 11.5, color: t.faint }}>{detail}</div></div>
    </div>
  );
}
function FlagRow({ bad, warnOnly, label, good, warn }) {
  const isBad = bad || warnOnly;
  const col = warnOnly ? t.attn : t.bad;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "3px 0" }}>
      {isBad ? <AlertTriangle size={15} style={{ color: col, marginTop: 2, flexShrink: 0 }} /> : <CheckCircle2 size={15} style={{ color: t.met, marginTop: 2, flexShrink: 0 }} />}
      <div><div style={{ fontSize: 12.5 }}>{label}</div><div style={{ fontSize: 11, color: isBad ? col : t.faint }}>{isBad ? warn : good}</div></div>
    </div>
  );
}

const newId = () => "x" + Math.random().toString(36).slice(2, 9);

/* Experiential-learning entries: activity + planned hours + hours completed so far */
function ExpEditor({ expEntries, setExpEntries }) {
  function addEntry() { setExpEntries((cur) => [...cur, { id: newId(), name: "", hours: "", done: "" }]); }
  function update(id, patch) { setExpEntries((cur) => cur.map((e) => (e.id === id ? { ...e, ...patch } : e))); }
  function remove(id) { setExpEntries((cur) => cur.filter((e) => e.id !== id)); }
  const num = { ...input, width: 70, padding: "5px 7px", fontSize: 13 };
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {expEntries.map((e) => (
        <div key={e.id} style={{ border: `1px solid ${t.line}`, borderRadius: 8, padding: 8, background: "#fff", display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={e.name} onChange={(ev) => update(e.id, { name: ev.target.value })} placeholder="Activity (e.g. summer internship)" style={{ ...input, flex: 1, padding: "6px 8px", fontSize: 13 }} />
            <button onClick={() => remove(e.id)} title="Remove" style={iconBtn}><X size={13} /></button>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: t.slate, display: "flex", alignItems: "center", gap: 6 }}>
              Planned hrs
              <input type="number" min="0" value={e.hours} onChange={(ev) => update(e.id, { hours: ev.target.value })} style={num} />
            </label>
            <label style={{ fontSize: 12, color: t.slate, display: "flex", alignItems: "center", gap: 6 }}>
              Done so far
              <input type="number" min="0" value={e.done} onChange={(ev) => update(e.id, { done: ev.target.value })} style={num} />
            </label>
            {Number(e.hours) > 0 && Number(e.done) >= Number(e.hours) && <span style={{ fontSize: 11.5, color: t.met, fontWeight: 600 }}>✓ complete</span>}
          </div>
        </div>
      ))}
      <button onClick={addEntry} style={{ ...linkBtn }}><Plus size={13} style={{ verticalAlign: -2 }} /> Add experiential learning</button>
      {!expEntries.length && <p style={{ fontSize: 11.5, color: t.faint, margin: 0 }}>Add internships, practica, lab rotations, etc. You need {EL_HOURS} hours across your degree; log hours as you go.</p>}
    </div>
  );
}

/* Pre-Friedman / transfer courses approved to count toward a requirement */
function PriorCourses({ priorCourses, setPriorCourses, specs }) {
  function addRow() { setPriorCourses((cur) => [...cur, { id: newId(), title: "", institution: "", cr: "", countsToward: "elective" }]); }
  function update(id, patch) { setPriorCourses((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p))); }
  function remove(id) { setPriorCourses((cur) => cur.filter((p) => p.id !== id)); }
  return (
    <div style={{ ...panel, padding: 0, overflow: "hidden", marginTop: 14 }}>
      <div style={bannerGreen}>Courses from before Friedman</div>
      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 12.5, color: t.slate, marginTop: 0 }}>
          List any prior coursework your advisor has approved to count toward a Friedman requirement. These don't add Friedman credits, but they can satisfy a core area or a specialization requirement.
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {priorCourses.map((p) => (
            <div key={p.id} style={{ border: `1px solid ${t.line}`, borderRadius: 8, padding: 10, background: "#fff", display: "grid", gap: 6 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <input value={p.title} onChange={(e) => update(p.id, { title: e.target.value })} placeholder="Course name" style={{ ...input, flex: 2, minWidth: 140, padding: "6px 8px", fontSize: 13 }} />
                <input value={p.cr} onChange={(e) => update(p.id, { cr: e.target.value })} placeholder="cr" style={{ ...input, width: 56, padding: "6px 8px", fontSize: 13 }} />
                <button onClick={() => remove(p.id)} title="Remove" style={iconBtn}><X size={13} /></button>
              </div>
              <input value={p.institution} onChange={(e) => update(p.id, { institution: e.target.value })} placeholder="Institution (optional)" style={{ ...input, padding: "6px 8px", fontSize: 13 }} />
              <label style={{ fontSize: 12, color: t.slate }}>
                Counts toward
                <select value={p.countsToward} onChange={(e) => update(p.id, { countsToward: e.target.value })} style={{ ...input, marginTop: 4, fontSize: 13 }}>
                  {countsOptions(specs).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            </div>
          ))}
        </div>
        <button onClick={addRow} style={{ ...linkBtn, marginTop: 8 }}><Plus size={13} style={{ verticalAlign: -2 }} /> Add a prior course</button>
        {!priorCourses.length && <p style={{ fontSize: 11.5, color: t.faint, marginBottom: 0 }}>Nothing added yet.</p>}
      </div>
    </div>
  );
}

/* --------------------------------- Advisor --------------------------------- */
function Advisor() {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [plans, setPlans] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [srcNote, setSrcNote] = useState("");

  async function unlock() {
    if (code !== ADVISOR_PASSCODE) { setPlans([{ error: "Wrong passcode." }]); return; }
    setUnlocked(true);
    const res = await store.list("plan:", true);
    const keys = (res && res.keys) || [];
    const local = [];
    for (const k of keys) {
      const r = await store.get(k, true);
      if (r && r.value) { try { local.push({ key: k, ...JSON.parse(r.value) }); } catch (e) {} }
    }
    let out = local, note = "";
    if (SYNC_URL) {
      const sv = await serverList(code);
      if (sv.ok && Array.isArray(sv.plans)) {
        const byName = {};
        [...sv.plans.map((p) => ({ key: "srv:" + slug(p.name || ""), ...p })), ...local].forEach((p) => {
          const k = slug(p.name || "") || p.key;
          if (!byName[k] || (p.savedAt || "") > (byName[k].savedAt || "")) byName[k] = p;
        });
        out = Object.values(byName);
        note = `${sv.plans.length} plan(s) from the shared server` + (local.length ? `, merged with ${local.length} saved in this browser (newest copy kept).` : ".");
      } else note = `Couldn't reach the shared plan server (${sv.error || "unknown error"}) — showing only plans saved in this browser.`;
    } else note = "No shared plan server is configured, so this list only shows plans saved in this same browser. See SERVER_SETUP.md to enable collecting plans from all students.";
    out.sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
    setPlans(out); setSrcNote(note);
  }

  if (!unlocked) {
    return (
      <div style={{ ...panel, maxWidth: 420, margin: "40px auto" }}>
        <h2 style={h2}><Lock size={17} style={{ verticalAlign: -3, marginRight: 8 }} />Advisor view</h2>
        <p style={{ color: t.slate, fontSize: 13.5, marginTop: -4 }}>Enter your advisor passcode to see saved student plans.</p>
        <PassInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="Passcode" onKeyDown={(e) => e.key === "Enter" && unlock()} />
        {plans[0]?.error && <p style={{ color: t.bad, fontSize: 13, marginTop: 6 }}>{plans[0].error}</p>}
        <button onClick={unlock} style={primaryBtn}>Open</button>
        <p style={{ fontSize: 11.5, color: t.faint, marginTop: 12 }}>Change the passcode near the top of the code. Saved plans use the app's shared storage, so treat them as planning drafts rather than confidential records.</p>
      </div>
    );
  }
  const real = plans.filter((p) => !p.error);
  const selected = real.find((p) => p.key === openId);
  if (selected) return <WorksheetView rec={selected} onBack={() => setOpenId(null)} />;
  return (
    <div style={{ paddingTop: 24 }}>
      <h2 style={h2}>Student plans <span style={{ fontSize: 14, color: t.slate }}>({real.length})</span></h2>
      {srcNote && <p style={{ fontSize: 12.5, color: t.slate, marginTop: -6 }}>{srcNote}</p>}
      {!real.length && <div style={{ ...panel, color: t.slate }}>No saved plans yet. Once a student saves, their plan appears here.</div>}
      <div style={{ display: "grid", gap: 10 }}>
        {real.map((p) => {
          const total = Object.values(p.placed || {}).flat().map(resolveCourse).filter(Boolean).reduce((s, c) => s + (c.cr || 0), 0);
          const target = p.program === "online" ? 30 : 48;
          const el = expTotals(legacyExp(p));
          return (
            <div key={p.key} style={{ ...panel, cursor: "pointer" }} onClick={() => setOpenId(p.key)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontFamily: t.serif, fontSize: 17 }}>{p.name}</div>
                  <div style={{ fontSize: 12.5, color: t.slate }}>{p.program === "online" ? "Online MS" : "On-campus MS"} · started {p.startTerm} {p.startYear} · {(p.specs || []).join(", ") || "no specialization"}</div>
                </div>
                <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 13, color: t.slate }}>
                  <span>{total}/{target} cr</span>
                  <span>{p.thesis ? "EL: thesis" : `EL: ${el.done}/${EL_HOURS} hrs done`}</span>
                  <span style={{ color: t.blue, fontWeight: 600 }}>Open worksheet →</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Read-only worksheet for one saved plan */
function WorksheetView({ rec, onBack }) {
  const program = rec.program;
  const creditTarget = program === "online" ? 30 : 48;
  const a = analyzePlan({ placed: rec.placed, semesters: rec.semesters, specs: rec.specs, program, priorCourses: rec.priorCourses, prereqChecks: rec.prereqChecks });
  const expList = normalizeExp(legacyExp(rec));
  const el = expTotals(expList);
  const priorList = rec.priorCourses || [];
  const wish = rec.wishlist || [];
  const placedSet = new Set(Object.values(rec.placed || {}).flat().map(itemCode));
  const coreCount = [a.nutsci, a.quant, a.policy].filter(Boolean).length;
  return (
    <div style={{ paddingTop: 20 }}>
      <button onClick={onBack} style={{ ...secondaryBtn, width: "auto", padding: "7px 14px", marginBottom: 14 }}>← All students</button>
      <div style={{ ...panel, padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={bannerBlue}>{rec.name} — degree worksheet</div>
        <div style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 13, color: t.slate }}>
            {program === "online" ? "Online MS (30 cr)" : "On-campus MS (48 cr)"} · started {rec.startTerm} {rec.startYear}{rec.intl ? " · international student" : ""} · {(rec.specs || []).join(", ") || "no specialization"}
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 10, fontSize: 14 }}>
            <span>Credits: <b style={{ color: a.totalCr >= creditTarget ? t.met : t.ink }}>{a.totalCr}/{creditTarget}</b></span>
            <span>Core areas: <b style={{ color: coreCount === 3 ? t.met : t.ink }}>{coreCount}/3</b></span>
            <span>Experiential: <b style={{ color: rec.thesis || el.planned >= EL_HOURS ? t.met : t.ink }}>{expSummary(!!rec.thesis, el.planned, el.done)}</b></span>
            {a.conflicts.length > 0 && <span style={{ color: t.bad }}>{a.conflicts.length} time conflict(s)</span>}
            {a.termWarnings.length > 0 && <span style={{ color: t.attn }}>{a.termWarnings.length} off-term course(s)</span>}
            {a.prereqFlags.length > 0 && <span style={{ color: t.attn }}>{a.prereqFlags.length} prerequisite(s) to check</span>}
          </div>
          {rec.comments && rec.comments.trim() ? (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "#f4f8fc", border: "1px solid #d7e3ef", borderRadius: 8, fontSize: 13.5, whiteSpace: "pre-wrap" }}>
              <b>Student comments / requests:</b> {rec.comments.trim()}
            </div>
          ) : null}
          <div style={{ fontSize: 11.5, color: t.faint, marginTop: 8 }}>Saved {rec.savedAt ? new Date(rec.savedAt).toLocaleString() : "—"}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(260px,1fr)", gap: 18, alignItems: "start" }} className="planGrid">
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
            {(rec.semesters || []).map((s) => {
              const arr = (rec.placed?.[s.id] || []).map(resolveCourse);
              const cr = arr.reduce((x, c) => x + (c.cr || 0), 0);
              const semConflicts = a.conflicts.filter((c) => c.sid === s.id);
              const semTermWarn = a.termWarnings.filter((w) => w.sid === s.id);
              return (
                <div key={s.id} style={{ border: `1px solid ${t.line}`, borderRadius: 10, padding: 10, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontFamily: t.serif, fontSize: 15 }}>{s.term} {s.year}</div>
                    <div style={{ fontSize: 12, color: t.slate }}>{cr} cr</div>
                  </div>
                  {arr.map((c, i) => {
                    const bad = semConflicts.some((x) => x.a === c.code || x.b === c.code);
                    const off = semTermWarn.some((w) => w.code === c.code);
                    const pre = a.prereqFlags.find((p) => p.code === c.code && p.sid === s.id);
                    const bk = (c.meetings && c.meetings[s.term]) || [];
                    return (
                      <div key={i} style={{ fontSize: 12, marginTop: 6, borderLeft: `3px solid ${familyColor[c.fam] || t.line}`, paddingLeft: 6, color: bad ? t.bad : off ? t.attn : t.ink }}>
                        {c.code} — {c.title} ({c.cr}cr){c.approved ? " ✓approved" : ""}
                        {bk.length > 0 && <div style={{ fontSize: 10.5, color: t.faint }}>{bk.map(fmtBlock).join(" · ")}</div>}
                        {pre && <div style={{ fontSize: 10.5, color: t.attn }}>⚠ prereq: {pre.items.filter((x) => x.status !== "planned" && x.status !== "checked").map((x) => (x.note ? `${x.short || x.label}: ${x.note}` : x.label + (x.status === "late" ? " (too late)" : ""))).join("; ")}</div>}
                      </div>
                    );
                  })}
                  {!arr.length && <div style={{ fontSize: 12, color: t.faint, marginTop: 6 }}>(empty)</div>}
                  {semConflicts.map((c, i) => <div key={i} style={{ fontSize: 11, color: t.bad, marginTop: 6 }}>⚠ {c.a} & {c.b} overlap ({c.when})</div>)}
                  {semTermWarn.map((w, i) => <div key={"t" + i} style={{ fontSize: 11, color: t.attn, marginTop: 6 }}>⚠ {w.code} not offered in {w.term} (runs {w.offered.join("/")})</div>)}
                </div>
              );
            })}
          </div>
          {!rec.thesis && expList.length > 0 && (
            <div style={{ ...panel, marginTop: 14 }}>
              <div style={{ fontFamily: t.serif, fontSize: 15, marginBottom: 6 }}>Experiential learning</div>
              {expList.map((e, i) => <div key={i} style={{ fontSize: 13, color: t.slate }}>• {e.name || "(untitled)"} — {Number(e.done) || 0} of {e.hours || 0} hrs done</div>)}
            </div>
          )}
          {wish.length > 0 && (
            <div style={{ ...panel, marginTop: 14 }}>
              <div style={{ fontFamily: t.serif, fontSize: 15, marginBottom: 6 }}>Elective wish list</div>
              {wish.map((w, i) => { const c = wishCourse(w); return <div key={i} style={{ fontSize: 13, color: t.slate }}>• {c.code} — {c.title}{c.school ? ` [${c.school}]` : ""}{placedSet.has(c.code) ? " (in plan)" : ""}{w.note ? <span style={{ color: t.ink }}> — {w.note}</span> : null}</div>; })}
            </div>
          )}
          {priorList.length > 0 && (
            <div style={{ ...panel, marginTop: 14 }}>
              <div style={{ fontFamily: t.serif, fontSize: 15, marginBottom: 6 }}>Courses from before Friedman (approved)</div>
              {priorList.map((pc, i) => <div key={i} style={{ fontSize: 13, color: t.slate }}>• {pc.title || "(untitled)"}{pc.institution ? " — " + pc.institution : ""}{pc.cr ? " (" + pc.cr + " cr)" : ""} → {labelForCounts(pc.countsToward, rec.specs)}</div>)}
            </div>
          )}
        </div>

        <div style={{ ...panel, padding: 0, overflow: "hidden" }}>
          <div style={bannerGreen}>Requirement check</div>
          <div style={{ padding: 18 }}>
            <ReqRow ok={a.nutsci} label="Nutrition science core" detail="NUTC/NUTR 202, or 245+246, or 370+371" />
            <ReqRow ok={a.quant} label="Quantitative reasoning core" detail={program === "online" ? "NUTB 250" : "NUTR 206 / 207"} />
            <ReqRow ok={a.policy} label="Policy & programs core" detail={a.policyPair ? "met via ON222 + ON223" : "one policy course"} />
            <ReqRow ok={!!rec.thesis || el.planned >= EL_HOURS} label="Experiential learning" detail={expSummary(!!rec.thesis, el.planned, el.done)} />
            <div style={{ borderTop: `1px solid ${t.lineSoft}`, margin: "12px 0 8px" }} />
            {!a.specResults.length && <div style={{ fontSize: 12.5, color: t.faint }}>No specialization chosen.</div>}
            {a.specResults.map((r) => (
              <div key={r.name} style={{ marginBottom: 8 }}>
                {r.byo ? <ReqRow neutral label={r.name} detail="Build Your Own — advisor review" />
                  : r.online ? <ReqRow ok={r.ok} label={r.name} detail={`${r.poolCr} cr in area (need ≥ 9)`} />
                  : <ReqRow ok={r.ok} label={r.name} detail={`${r.have.length + (r.subs ? r.subs.length : 0)}/${(r.required || []).length} required courses`} />}
                {(r.subs || []).length > 0 && <div style={{ marginLeft: 26, fontSize: 11, color: t.green }}>{r.subs.map((s, i) => <div key={i}>✓ {s.label} (approved{s.prior ? ", pre-Friedman" : ""})</div>)}</div>}
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${t.lineSoft}`, margin: "8px 0" }} />
            {a.prereqFlags.length > 0 && <FlagRow warnOnly label={`Prerequisites to check: ${a.prereqFlags.length}`} warn={a.prereqFlags.map((p) => p.code).join(", ")} />}
            {program === "online" && (
              <>
                <FlagRow bad={a.inPersonCount > 2} label={`In-person Boston courses: ${a.inPersonCount} / 2`} good="within limit" warn={`over the limit (${a.inPersonList.join(", ")})`} />
                <FlagRow bad={a.directedCr > 6} label={`Directed-study credits: ${a.directedCr} / 6`} good="within limit" warn="over the 6-credit cap" />
              </>
            )}
            {program === "campus" && rec.intl && <FlagRow bad={a.onlineCredits > 12} label={`Online credits: ${a.onlineCredits} / 12`} good="within the international cap" warn="over the 12-credit cap" />}
            {program === "campus" && <FlagRow bad={a.directedCr > 12} label={`Directed-study credits: ${a.directedCr} / 12`} good="within limit" warn="over the 12-credit cap" />}
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 860px){ .planGrid{ grid-template-columns: minmax(0,1fr) !important; } }`}</style>
    </div>
  );
}

/* ------------------------------- shared styles ----------------------------- */
const panel = { background: t.card, border: `1px solid ${t.line}`, borderRadius: 12, padding: 18, boxShadow: "0 1px 2px rgba(20,40,70,.04)" };
const h2 = { fontFamily: t.serif, fontSize: 20, margin: "0 0 12px", color: t.ink };
const bannerBase = { fontFamily: t.serif, color: "#fff", fontSize: 16.5, padding: "10px 18px", letterSpacing: 0.2 };
const bannerBlue = { ...bannerBase, background: t.blueBright };
const bannerGreen = { ...bannerBase, background: t.green };
const input = { width: "100%", boxSizing: "border-box", border: `1px solid ${t.line}`, borderRadius: 8, padding: "9px 11px", fontSize: 14, color: t.ink, background: "#fff", outline: "none", fontFamily: t.sans };
const primaryBtn = { marginTop: 14, width: "100%", background: t.navy, color: "#fff", border: "none", borderRadius: 8, padding: "11px 16px", fontSize: 14.5, cursor: "pointer" };
const secondaryBtn = { background: "#fff", color: t.navy, border: `1px solid ${t.navy}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, cursor: "pointer" };
const linkBtn = { background: "none", border: "none", color: t.navy, fontSize: 13, cursor: "pointer", padding: 0 };
const iconBtn = { background: "none", border: `1px solid ${t.line}`, borderRadius: 5, padding: 2, cursor: "pointer", color: t.slate, lineHeight: 0 };
const chip = { border: `1px solid ${t.line}`, borderRadius: 20, padding: "6px 12px", fontSize: 12.5, cursor: "pointer", background: "#fff" };
const choiceCard = { flex: 1, minWidth: 150, textAlign: "left", border: `1.5px solid ${t.line}`, borderRadius: 10, padding: "12px 14px", background: "#fff", cursor: "pointer" };

/* passcode input with show/hide toggle */
function PassInput({ value, onChange, placeholder, onKeyDown }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input value={value} onChange={onChange} onKeyDown={onKeyDown} type={show ? "text" : "password"} placeholder={placeholder} style={{ ...input, paddingRight: 34 }} />
      <button type="button" onClick={() => setShow((s) => !s)} title={show ? "Hide passcode" : "Show passcode"} aria-label={show ? "Hide passcode" : "Show passcode"}
        style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: t.slate, padding: 4, lineHeight: 0 }}>
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}
function Field({ label, children, style }) {
  return (
    <div style={{ margin: "14px 0", ...style }}>
      <div style={{ fontSize: 12.5, color: t.slate, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  );
}

/* ---------------------------------- mount ---------------------------------- */
if (typeof document !== "undefined" && document.getElementById("root")) {
  createRoot(document.getElementById("root")).render(<App />);
}
