const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building Clean, Professional, User-Friendly Master Flowchart PDF v3...');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>QuickLifeNow Task Management - Complete System Guide & Flowcharts</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');

  @page {
    size: A4 landscape;
    margin: 6mm 8mm;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    font-family: 'Segoe UI', 'Inter', -apple-system, sans-serif;
    color: #0f172a;
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 11px;
  }

  /* Critical: Strictly force all connector paths to have NO fill */
  svg > path, .flow-line, path:not(marker path):not(marker polygon) {
    fill: none !important;
  }

  .page {
    width: 100%;
    height: 100vh;
    max-height: 196mm;
    padding: 6px 12px;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: #ffffff;
    position: relative;
    overflow: hidden;
  }

  .page:last-child {
    page-break-after: avoid;
  }

  /* Header */
  .diagram-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 4px;
    margin-bottom: 5px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-icon {
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    border-radius: 6px;
    color: #ffffff;
    font-weight: 900;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .header-title-box h1 {
    font-size: 14.5px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    line-height: 1.15;
  }

  .header-title-box p {
    font-size: 9.5px;
    color: #64748b;
    margin: 1px 0 0 0;
    font-weight: 600;
  }

  .diagram-legend {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 8.5px;
    font-weight: 700;
    color: #334155;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    padding: 3px 8px;
    border-radius: 5px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .pill-sample {
    width: 16px;
    height: 9px;
    border-radius: 5px;
    background: #ffe4e6;
    border: 1.2px solid #e11d48;
  }

  .para-sample {
    width: 14px;
    height: 9px;
    background: #e0f2fe;
    border: 1.2px solid #0284c7;
    transform: skewX(-15deg);
  }

  .rect-sample {
    width: 14px;
    height: 9px;
    background: #fef9c3;
    border: 1.2px solid #ca8a04;
    border-radius: 2px;
  }

  .dia-sample {
    width: 9px;
    height: 9px;
    background: #ffedd5;
    border: 1.2px solid #ea580c;
    transform: rotate(45deg);
  }

  /* Full-Page Canvas */
  .canvas-container {
    flex: 1;
    background: #ffffff;
    border: 1.5px solid #94a3b8;
    border-radius: 6px;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }

  .canvas-container svg {
    width: 100%;
    height: 100%;
    max-height: 174mm;
  }

  /* Footer */
  .diagram-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #cbd5e1;
    padding-top: 3px;
    margin-top: 4px;
    font-size: 8px;
    color: #64748b;
    font-weight: 600;
  }

  /* Table styles for Page 3 */
  .manual-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 10px;
    width: 100%;
    height: 100%;
    padding: 8px;
  }

  .manual-card {
    background: #ffffff;
    border: 1.5px solid #cbd5e1;
    border-radius: 6px;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
  }

  .manual-card h2 {
    font-size: 11.5px;
    font-weight: 800;
    color: #1e293b;
    margin: 0 0 5px 0;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 3px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .manual-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
  }

  .manual-table th {
    background: #f1f5f9;
    color: #334155;
    text-align: left;
    padding: 4px 6px;
    font-weight: 700;
    border-bottom: 1px solid #cbd5e1;
  }

  .manual-table td {
    padding: 4px 6px;
    border-bottom: 1px solid #f1f5f9;
    color: #475569;
    vertical-align: middle;
  }

  .badge-status {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 3px;
    font-weight: 700;
    font-size: 8px;
  }
  .bg-blue { background: #e0f2fe; color: #0369a1; }
  .bg-green { background: #dcfce7; color: #15803d; }
  .bg-amber { background: #fef3c7; color: #b45309; }
  .bg-rose { background: #ffe4e6; color: #be123c; }
  .bg-purple { background: #f3e8ff; color: #7e22ce; }
</style>
</head>
<body>

<!-- =================================================================== -->
<!-- PAGE 1: MASTER END-TO-END CORE LIFECYCLE FLOWCHART                  -->
<!-- =================================================================== -->
<div class="page">
  <div class="diagram-header">
    <div class="header-left">
      <div class="logo-icon">Q</div>
      <div class="header-title-box">
        <h1>QuickLifeNow Task Management — Master End-to-End Operational Flowchart</h1>
        <p>Complete lifecycle: Authentication ➔ 1-to-Many Creation ➔ Multi-Level Delegation ➔ Clarification Loop ➔ Review & Revision ➔ Final Sign-off</p>
      </div>
    </div>
    <div class="diagram-legend">
      <div class="legend-item"><span class="pill-sample"></span> Start / Terminal</div>
      <div class="legend-item"><span class="para-sample"></span> User Action / Input</div>
      <div class="legend-item"><span class="rect-sample"></span> System Process</div>
      <div class="legend-item"><span class="dia-sample"></span> Decision Condition</div>
      <div class="legend-item"><span>⨂</span> Junction Point</div>
    </div>
  </div>

  <div class="canvas-container">
    <svg viewBox="0 0 1440 680" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr-black" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <polygon points="0,1.5 8,5 0,8.5" fill="#1e293b"/>
        </marker>
        <marker id="arr-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <polygon points="0,1.5 8,5 0,8.5" fill="#16a34a"/>
        </marker>
        <marker id="arr-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <polygon points="0,1.5 8,5 0,8.5" fill="#dc2626"/>
        </marker>
      </defs>

      <!-- Lane Headers -->
      <rect x="20" y="6" width="330" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.2"/>
      <text x="185" y="22" font-size="11" font-weight="800" fill="#1e293b" text-anchor="middle">LANE 1: AUTH & TASK CREATION</text>

      <rect x="375" y="6" width="345" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.2"/>
      <text x="547" y="22" font-size="11" font-weight="800" fill="#1e293b" text-anchor="middle">LANE 2: MULTI-LEVEL DELEGATION</text>

      <rect x="745" y="6" width="345" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.2"/>
      <text x="917" y="22" font-size="11" font-weight="800" fill="#1e293b" text-anchor="middle">LANE 3: EXECUTION & CLARIFICATION</text>

      <rect x="1115" y="6" width="310" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.2"/>
      <text x="1270" y="22" font-size="11" font-weight="800" fill="#1e293b" text-anchor="middle">LANE 4: REVIEW & FINAL SIGN-OFF</text>

      <!-- ======================================================== -->
      <!-- LANE 1: AUTHENTICATION & MULTI-RECIPIENT CREATION        -->
      <!-- Center = 185px                                           -->
      <!-- ======================================================== -->

      <!-- Start Terminal -->
      <rect x="120" y="38" width="130" height="30" rx="15" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8"/>
      <text x="185" y="57" font-size="11" font-weight="800" fill="#9f1239" text-anchor="middle">Start System</text>

      <path class="flow-line" d="M 185 68 L 185 88" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- User Login -->
      <polygon points="90,88 295,88 275,124 70,124" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="182" y="103" font-size="10" font-weight="700" fill="#0369a1" text-anchor="middle">User Enters Email & Password</text>
      <text x="182" y="116" font-size="8.5" fill="#0284c7" text-anchor="middle">(Admin, Sub-Admin, or Employee)</text>

      <path class="flow-line" d="M 182 124 L 182 144" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Authenticate & Load Role Dashboard -->
      <rect x="67" y="144" width="230" height="36" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="182" y="159" font-size="10" font-weight="700" fill="#854d0e" text-anchor="middle">Authenticate via Sanctum Token;</text>
      <text x="182" y="172" font-size="9" fill="#a16207" text-anchor="middle">Load Role Dashboard & Metrics</text>

      <path class="flow-line" d="M 182 180 L 182 200" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Click + New Task -->
      <polygon points="90,200 295,200 275,236 70,236" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="182" y="216" font-size="10.5" font-weight="800" fill="#0369a1" text-anchor="middle">Click '+ New Task' Button</text>
      <text x="182" y="228" font-size="8.5" fill="#0284c7" text-anchor="middle">(Header Bar or Navigation Sidebar)</text>

      <path class="flow-line" d="M 182 236 L 182 256" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Input Form Specifications -->
      <polygon points="85,256 300,256 275,302 60,302" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="180" y="272" font-size="9.5" font-weight="700" fill="#0369a1" text-anchor="middle">Input Title, Priority, Department,</text>
      <text x="180" y="284" font-size="9.5" font-weight="700" fill="#0369a1" text-anchor="middle">Due Date & Execution Guidelines</text>
      <text x="180" y="295" font-size="8" fill="#0284c7" text-anchor="middle">Upload Reference Document Files</text>

      <path class="flow-line" d="M 180 302 L 180 322" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- 1-to-Many Assignees Selection -->
      <polygon points="85,322 300,322 275,366 60,366" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="180" y="338" font-size="10" font-weight="800" fill="#0369a1" text-anchor="middle">Select 1 or More Assignees</text>
      <text x="180" y="350" font-size="9" fill="#0284c7" text-anchor="middle">(1-to-Many: Lead 1, Lead 2, etc.)</text>
      <text x="180" y="361" font-size="8.5" font-weight="700" fill="#0369a1" text-anchor="middle">Click 'Create Task'</text>

      <path class="flow-line" d="M 180 366 L 180 388" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- System Generates Root Task -->
      <rect x="65" y="388" width="230" height="38" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="180" y="403" font-size="10" font-weight="800" fill="#854d0e" text-anchor="middle">System Creates Root Task (T-010)</text>
      <text x="180" y="416" font-size="8.5" fill="#a16207" text-anchor="middle">Stored in Database with Creator Ownership</text>

      <path class="flow-line" d="M 180 426 L 180 448" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- System Generates Parallel Sub-branches -->
      <rect x="65" y="448" width="230" height="42" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="180" y="465" font-size="10" font-weight="800" fill="#854d0e" text-anchor="middle">Creates Parallel Sub-Branches:</text>
      <text x="180" y="478" font-size="9.5" font-weight="700" fill="#b45309" text-anchor="middle">QL-0010.1 & QL-0010.2</text>

      <path class="flow-line" d="M 180 490 L 180 512" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Fire Alerts & History Log -->
      <rect x="65" y="512" width="230" height="38" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="180" y="527" font-size="9.5" font-weight="700" fill="#854d0e" text-anchor="middle">Dispatches Alerts to Assignees</text>
      <text x="180" y="540" font-size="8.5" fill="#a16207" text-anchor="middle">& Logs Record to Activity History</text>

      <!-- Exit Line from Lane 1 to Junction 1 -->
      <path class="flow-line" d="M 180 550 L 180 590 L 350 590" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Junction 1 -->
      <circle cx="362" cy="590" r="10" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
      <line x1="355" y1="583" x2="369" y2="597" stroke="#1e293b" stroke-width="1.8"/>
      <line x1="369" y1="583" x2="355" y2="597" stroke="#1e293b" stroke-width="1.8"/>

      <!-- Path up the gutter into Lane 2 -->
      <path class="flow-line" d="M 362 580 L 362 54 L 440 54" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- ======================================================== -->
      <!-- LANE 2: MULTI-LEVEL DELEGATION (LEVELS 1 TO 6)           -->
      <!-- Center = 547px                                           -->
      <!-- ======================================================== -->

      <!-- Task Arrives in Assignee Queue -->
      <rect x="440" y="38" width="215" height="34" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="547" y="53" font-size="10" font-weight="800" fill="#854d0e" text-anchor="middle">Task Enters Assignee's Queue</text>
      <text x="547" y="65" font-size="8.5" fill="#b45309" text-anchor="middle">('My Action Required' Tab)</text>

      <path class="flow-line" d="M 547 72 L 547 94" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Decision Diamond: Need to delegate? -->
      <polygon points="547,94 625,130 547,166 469,130" fill="#ffedd5" stroke="#ea580c" stroke-width="1.8"/>
      <text x="547" y="127" font-size="9.5" font-weight="800" fill="#9a3412" text-anchor="middle">Lead delegates to</text>
      <text x="547" y="139" font-size="9.5" font-weight="800" fill="#9a3412" text-anchor="middle">sub-team member?</text>

      <!-- YES Branch: Delegate to Sub-team (Right) -->
      <path class="flow-line" d="M 625 130 L 650 130 L 650 182" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arr-green)"/>
      <text x="632" y="122" font-size="9" font-weight="800" fill="#16a34a">Yes</text>

      <!-- Click Delegate Work -->
      <polygon points="600,182 710,182 690,220 580,220" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="645" y="198" font-size="9" font-weight="700" fill="#0369a1" text-anchor="middle">Click 'Delegate Work'</text>
      <text x="645" y="210" font-size="8" fill="#0284c7" text-anchor="middle">Pick sub-team member</text>

      <path class="flow-line" d="M 645 220 L 645 242" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Creates Level 3 Branch -->
      <rect x="580" y="242" width="130" height="38" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="645" y="258" font-size="9" font-weight="800" fill="#854d0e" text-anchor="middle">Creates Level 3 Branch:</text>
      <text x="645" y="270" font-size="8.5" font-weight="700" fill="#b45309" text-anchor="middle">Code: QL-0010.1.1</text>

      <path class="flow-line" d="M 645 280 L 645 302" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arr-black)"/>

      <!-- Scales up to 6 Levels -->
      <rect x="575" y="302" width="140" height="38" rx="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
      <text x="645" y="317" font-size="8.5" font-weight="800" fill="#334155" text-anchor="middle">Scales up to 6 Levels:</text>
      <text x="645" y="329" font-size="7.5" fill="#64748b" text-anchor="middle">1.1.1.1 ➔ 1.1.1.1.1 ➔ 1.1.1.1.1.1</text>

      <!-- NO Branch: Direct Execution (Left side of Lane 2) -->
      <path class="flow-line" d="M 469 130 L 445 130 L 445 182" stroke="#dc2626" stroke-width="1.8" marker-end="url(#arr-red)"/>
      <text x="450" y="122" font-size="9" font-weight="800" fill="#dc2626">No</text>

      <!-- Retains Direct Work -->
      <rect x="390" y="182" width="130" height="42" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="455" y="198" font-size="9" font-weight="700" fill="#854d0e" text-anchor="middle">Assignee Retains</text>
      <text x="455" y="210" font-size="9" font-weight="700" fill="#854d0e" text-anchor="middle">Direct Ownership</text>
      <text x="455" y="220" font-size="7.5" fill="#a16207" text-anchor="middle">Prepares scope deliverables</text>

      <!-- Merge Lines from Yes and No -->
      <path class="flow-line" d="M 455 224 L 455 352 L 547 352" stroke="#1e293b" stroke-width="1.8"/>
      <path class="flow-line" d="M 645 340 L 645 352 L 547 352" stroke="#1e293b" stroke-width="1.8"/>

      <path class="flow-line" d="M 547 352 L 547 372" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Horizontal Isolation Policy Box -->
      <rect x="390" y="372" width="315" height="110" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="547" y="392" font-size="10" font-weight="800" fill="#0f172a" text-anchor="middle">Horizontal Isolation Architecture:</text>
      <text x="405" y="410" font-size="8.5" fill="#334155">• Lead 1 cannot see or access Lead 2's tasks</text>
      <text x="405" y="425" font-size="8.5" fill="#334155">• Sub-assignees only see assigned child scope</text>
      <text x="405" y="440" font-size="8.5" fill="#334155">• Parent leads track child progress in real time</text>
      <text x="405" y="455" font-size="8.5" fill="#334155">• Zero cross-department interference or leaks</text>
      <text x="405" y="470" font-size="8.5" font-weight="700" fill="#0284c7">• Full isolation guaranteed across all 6 levels</text>

      <!-- Exit Line from Lane 2 to Junction 2 -->
      <path class="flow-line" d="M 547 482 L 547 520 L 720 520" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Junction 2 -->
      <circle cx="732" cy="520" r="10" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
      <line x1="725" y1="513" x2="739" y2="527" stroke="#1e293b" stroke-width="1.8"/>
      <line x1="739" y1="513" x2="725" y2="527" stroke="#1e293b" stroke-width="1.8"/>

      <!-- Path up the gutter into Lane 3 -->
      <path class="flow-line" d="M 732 510 L 732 54 L 810 54" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- ======================================================== -->
      <!-- LANE 3: EXECUTION & QUESTION CLARIFICATION LOOP          -->
      <!-- Center = 917px                                           -->
      <!-- ======================================================== -->

      <!-- Inspect Requirements -->
      <rect x="810" y="38" width="220" height="34" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="920" y="53" font-size="10" font-weight="800" fill="#854d0e" text-anchor="middle">Assignee Inspects Requirements,</text>
      <text x="920" y="65" font-size="8.5" fill="#a16207" text-anchor="middle">Goals, Due Date & Reference Files</text>

      <path class="flow-line" d="M 920 72 L 920 94" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Decision Diamond: Are Instructions Clear? -->
      <polygon points="920,94 995,130 920,166 845,130" fill="#ffedd5" stroke="#ea580c" stroke-width="1.8"/>
      <text x="920" y="127" font-size="9.5" font-weight="800" fill="#9a3412" text-anchor="middle">Are Instructions</text>
      <text x="920" y="139" font-size="9.5" font-weight="800" fill="#9a3412" text-anchor="middle">100% Clear?</text>

      <!-- NO Branch: Request Details (Left Sub-Lane) -->
      <path class="flow-line" d="M 845 130 L 810 130 L 810 182" stroke="#dc2626" stroke-width="1.8" marker-end="url(#arr-red)"/>
      <text x="825" y="122" font-size="9" font-weight="800" fill="#dc2626">No</text>

      <!-- Click Request Missing Details -->
      <polygon points="765,182 865,182 845,220 745,220" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="805" y="198" font-size="8.5" font-weight="700" fill="#0369a1" text-anchor="middle">Click 'Request Details'</text>
      <text x="805" y="210" font-size="7.5" fill="#0284c7" text-anchor="middle">Type specific questions</text>

      <path class="flow-line" d="M 805 220 L 805 242" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Task Pauses in Waiting -->
      <rect x="750" y="242" width="120" height="38" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="810" y="258" font-size="8.5" font-weight="800" fill="#854d0e" text-anchor="middle">Status: 'Waiting Details'</text>
      <text x="810" y="270" font-size="7.5" fill="#a16207" text-anchor="middle">Assigner Alerted Instantly</text>

      <path class="flow-line" d="M 810 280 L 810 302" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Assigner Submits Answer -->
      <polygon points="765,302 865,302 845,340 745,340" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="805" y="318" font-size="8.5" font-weight="700" fill="#0369a1" text-anchor="middle">Assigner Submits Answer</text>
      <text x="805" y="330" font-size="7.5" fill="#0284c7" text-anchor="middle">& uploads required files</text>

      <!-- Loop Back Line to Resume -->
      <path class="flow-line" d="M 805 340 L 805 362 L 740 362 L 740 46 L 810 46" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arr-green)"/>
      <text x="746" y="356" font-size="7.5" font-weight="800" fill="#16a34a">Task Resumes</text>

      <!-- YES Branch: Direct Execution (Right Sub-Lane) -->
      <path class="flow-line" d="M 995 130 L 975 130 L 975 182" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arr-green)"/>
      <text x="980" y="122" font-size="9" font-weight="800" fill="#16a34a">Yes</text>

      <!-- Assignee Executes Work -->
      <rect x="895" y="182" width="165" height="40" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="977" y="198" font-size="9.5" font-weight="700" fill="#854d0e" text-anchor="middle">Assignee Executes Deliverables</text>
      <text x="977" y="211" font-size="8" fill="#a16207" text-anchor="middle">& Prepares Proof of Work</text>

      <path class="flow-line" d="M 977 222 L 977 244" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Upload Deliverables & Submit -->
      <polygon points="905,244 1060,244 1040,286 885,286" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="972" y="261" font-size="9.5" font-weight="800" fill="#0369a1" text-anchor="middle">Upload Files (PDF, ZIP, DOCX)</text>
      <text x="972" y="274" font-size="9" font-weight="700" fill="#0284c7" text-anchor="middle">& Click 'Submit Work for Review'</text>

      <path class="flow-line" d="M 972 286 L 972 308" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Status Changes to Under Review -->
      <rect x="890" y="308" width="170" height="40" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="975" y="324" font-size="9.5" font-weight="800" fill="#854d0e" text-anchor="middle">Task Leaves 'My Action';</text>
      <text x="975" y="337" font-size="8.5" fill="#b45309" text-anchor="middle">Status: 'Under Review'</text>

      <!-- Exit Line from Lane 3 to Junction 3 -->
      <path class="flow-line" d="M 975 348 L 975 390 L 1090 390" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Junction 3 -->
      <circle cx="1102" cy="390" r="10" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
      <line x1="1095" y1="383" x2="1109" y2="397" stroke="#1e293b" stroke-width="1.8"/>
      <line x1="1109" y1="383" x2="1095" y2="397" stroke="#1e293b" stroke-width="1.8"/>

      <!-- Path up the gutter into Lane 4 -->
      <path class="flow-line" d="M 1102 380 L 1102 54 L 1160 54" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- ======================================================== -->
      <!-- LANE 4: QUALITY REVIEW, REVISION & FINAL SIGN-OFF        -->
      <!-- Center = 1270px                                          -->
      <!-- ======================================================== -->

      <!-- Enters Review Queue -->
      <rect x="1160" y="38" width="220" height="34" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="1270" y="53" font-size="10" font-weight="800" fill="#854d0e" text-anchor="middle">Task Enters Reviewer's</text>
      <text x="1270" y="65" font-size="8.5" font-weight="700" fill="#b45309" text-anchor="middle">'Review Queue' Page</text>

      <path class="flow-line" d="M 1270 72 L 1270 94" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Download & Inspect Deliverables -->
      <polygon points="1175,94 1380,94 1360,132 1155,132" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="1267" y="110" font-size="9.5" font-weight="700" fill="#0369a1" text-anchor="middle">Reviewer Downloads Files &</text>
      <text x="1267" y="122" font-size="8.5" fill="#0284c7" text-anchor="middle">Inspects Deliverable Quality</text>

      <path class="flow-line" d="M 1267 132 L 1267 154" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Decision Diamond: Meets Standards? -->
      <polygon points="1267,154 1342,190 1267,226 1192,190" fill="#ffedd5" stroke="#ea580c" stroke-width="1.8"/>
      <text x="1267" y="187" font-size="9.5" font-weight="800" fill="#9a3412" text-anchor="middle">Meets Quality</text>
      <text x="1267" y="199" font-size="9.5" font-weight="800" fill="#9a3412" text-anchor="middle">Standards?</text>

      <!-- NO Branch: Return for Revision (Left) -->
      <path class="flow-line" d="M 1192 190 L 1155 190 L 1155 234" stroke="#dc2626" stroke-width="1.8" marker-end="url(#arr-red)"/>
      <text x="1165" y="182" font-size="9" font-weight="800" fill="#dc2626">No</text>

      <!-- Return Revision Action -->
      <polygon points="1110,234 1210,234 1190,272 1090,272" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="1150" y="250" font-size="8.5" font-weight="700" fill="#0369a1" text-anchor="middle">Click 'Return Revision'</text>
      <text x="1150" y="262" font-size="7.5" fill="#0284c7" text-anchor="middle">Enter fix instructions</text>

      <path class="flow-line" d="M 1150 272 L 1150 294" stroke="#dc2626" stroke-width="1.8" marker-end="url(#arr-red)"/>

      <!-- Status: Needs Correction -->
      <rect x="1090" y="294" width="125" height="38" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="1152" y="310" font-size="8.5" font-weight="800" fill="#854d0e" text-anchor="middle">Returns to Assignee;</text>
      <text x="1152" y="322" font-size="7.5" font-weight="700" fill="#b45309" text-anchor="middle">Status: Needs Correction</text>

      <!-- Loop Back to Lane 3 Execution -->
      <path class="flow-line" d="M 1090 313 L 1075 313 L 1075 202 L 1060 202" stroke="#dc2626" stroke-width="1.8" marker-end="url(#arr-red)"/>
      <rect x="1062" y="246" width="26" height="14" rx="2" fill="#fee2e2" stroke="#dc2626" stroke-width="1"/>
      <text x="1075" y="256" font-size="7.5" font-weight="800" fill="#b91c1c" text-anchor="middle">Fix</text>

      <!-- YES Branch: Approve Submission (Right) -->
      <path class="flow-line" d="M 1342 190 L 1365 190 L 1365 234" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arr-green)"/>
      <text x="1350" y="182" font-size="9" font-weight="800" fill="#16a34a">Yes</text>

      <!-- Approve Submission Action -->
      <polygon points="1285,234 1420,234 1400,272 1265,272" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="1342" y="250" font-size="9" font-weight="800" fill="#0369a1" text-anchor="middle">Click 'Approve Submission'</text>
      <text x="1342" y="262" font-size="8" fill="#0284c7" text-anchor="middle">Branch Marked Approved ✔</text>

      <path class="flow-line" d="M 1342 272 L 1342 294" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Decision Diamond: All Siblings Approved? -->
      <polygon points="1342,294 1417,330 1342,366 1267,330" fill="#ffedd5" stroke="#ea580c" stroke-width="1.8"/>
      <text x="1342" y="327" font-size="9" font-weight="800" fill="#9a3412" text-anchor="middle">All Sibling Branches</text>
      <text x="1342" y="338" font-size="9" font-weight="800" fill="#9a3412" text-anchor="middle">Fully Approved?</text>

      <!-- NO: Waiting on Other Branches -->
      <path class="flow-line" d="M 1417 330 L 1432 330 L 1432 253 L 1420 253" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>
      <text x="1425" y="324" font-size="8" font-weight="800" fill="#dc2626">No</text>
      <text x="1428" y="289" font-size="7" fill="#64748b" transform="rotate(90 1428 289)">Waiting for Others</text>

      <!-- YES: All Done -> Proceed to Creator Sign-off -->
      <path class="flow-line" d="M 1342 366 L 1342 402 L 1270 402 L 1270 422" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arr-green)"/>
      <text x="1348" y="382" font-size="8.5" font-weight="800" fill="#16a34a">Yes</text>

      <!-- Prompt Creator for Final Sign-off -->
      <rect x="1160" y="422" width="220" height="38" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="1270" y="438" font-size="9.5" font-weight="800" fill="#854d0e" text-anchor="middle">System Prompts Original Creator:</text>
      <text x="1270" y="450" font-size="8.5" fill="#a16207" text-anchor="middle">'All Sub-Branches Approved • Ready for Sign-Off'</text>

      <path class="flow-line" d="M 1270 460 L 1270 482" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Creator Clicks Final Sign-off -->
      <polygon points="1175,482 1380,482 1360,524 1155,524" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="1267" y="500" font-size="10" font-weight="800" fill="#0369a1" text-anchor="middle">Creator Inspects Combined Deliverables</text>
      <text x="1267" y="513" font-size="9.5" font-weight="800" fill="#0284c7" text-anchor="middle">& Clicks 'Final Sign-Off'</text>

      <path class="flow-line" d="M 1267 524 L 1267 546" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- Task Completed in DB -->
      <rect x="1155" y="546" width="230" height="38" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="1270" y="562" font-size="10" font-weight="800" fill="#854d0e" text-anchor="middle">Root Task Status Updated to 'Completed'</text>
      <text x="1270" y="574" font-size="8.5" fill="#a16207" text-anchor="middle">Permanent Milestone Stored in Audit Records</text>

      <path class="flow-line" d="M 1270 584 L 1270 608" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black)"/>

      <!-- End Terminal -->
      <rect x="1200" y="608" width="140" height="32" rx="16" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8"/>
      <text x="1270" y="628" font-size="11" font-weight="800" fill="#9f1239" text-anchor="middle">Task Completed ✔</text>

    </svg>
  </div>

  <div class="diagram-footer">
    <span>QuickLifeNow Enterprise Systems • Production Reference</span>
    <span>Master Flowchart 1: End-to-End Operational Lifecycle</span>
    <span>Page 1 of 3</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 2: OPERATIONS, COLLABORATION & EXCEPTIONS FLOWCHART            -->
<!-- =================================================================== -->
<div class="page">
  <div class="diagram-header">
    <div class="header-left">
      <div class="logo-icon">Q</div>
      <div class="header-title-box">
        <h1>QuickLifeNow Task Management — Operations, Collaboration & Administration Flowchart</h1>
        <p>Complete workflows: Direct Task Messaging, Branch Transfers, Hold / Resume, Task Cancellation, Audit Logs & Admin Controls</p>
      </div>
    </div>
    <div class="diagram-legend">
      <div class="legend-item"><span class="pill-sample"></span> Start / Terminal</div>
      <div class="legend-item"><span class="para-sample"></span> User Action / Input</div>
      <div class="legend-item"><span class="rect-sample"></span> System Process</div>
      <div class="legend-item"><span class="dia-sample"></span> Decision Condition</div>
      <div class="legend-item"><span>⨂</span> Junction Point</div>
    </div>
  </div>

  <div class="canvas-container">
    <svg viewBox="0 0 1440 475" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr-black2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <polygon points="0,1.5 8,5 0,8.5" fill="#1e293b"/>
        </marker>
        <marker id="arr-green2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <polygon points="0,1.5 8,5 0,8.5" fill="#16a34a"/>
        </marker>
        <marker id="arr-red2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <polygon points="0,1.5 8,5 0,8.5" fill="#dc2626"/>
        </marker>
      </defs>

      <!-- Lane Headers -->
      <rect x="20" y="6" width="330" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.2"/>
      <text x="185" y="22" font-size="11" font-weight="800" fill="#1e293b" text-anchor="middle">FEATURE 1: TASK MESSAGING & CHAT</text>

      <rect x="375" y="6" width="345" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.2"/>
      <text x="547" y="22" font-size="11" font-weight="800" fill="#1e293b" text-anchor="middle">FEATURE 2: TRANSFERS & HOLD / RESUME</text>

      <rect x="745" y="6" width="345" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.2"/>
      <text x="917" y="22" font-size="11" font-weight="800" fill="#1e293b" text-anchor="middle">FEATURE 3: AUDIT TRAIL & WORK LOGS</text>

      <rect x="1115" y="6" width="310" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.2"/>
      <text x="1270" y="22" font-size="11" font-weight="800" fill="#1e293b" text-anchor="middle">FEATURE 4: ADMIN CONTROLS & SECURITY</text>

      <!-- ======================================================== -->
      <!-- FEATURE 1: TASK MESSAGING & CHAT                         -->
      <!-- Center = 185px                                           -->
      <!-- ======================================================== -->

      <!-- Start Terminal -->
      <rect x="120" y="38" width="130" height="30" rx="15" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8"/>
      <text x="185" y="57" font-size="11" font-weight="800" fill="#9f1239" text-anchor="middle">Start Messages</text>

      <path class="flow-line" d="M 185 68 L 185 92" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Click Messages -->
      <polygon points="90,92 295,92 275,128 70,128" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="182" y="108" font-size="10" font-weight="700" fill="#0369a1" text-anchor="middle">Open 'Messages' in Navbar / Sidebar</text>
      <text x="182" y="120" font-size="8.5" fill="#0284c7" text-anchor="middle">Live Chat Threads Hub</text>

      <path class="flow-line" d="M 182 128 L 182 152" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Select Task Thread -->
      <polygon points="85,152 300,152 275,190 60,190" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="180" y="168" font-size="10" font-weight="700" fill="#0369a1" text-anchor="middle">Select Branch Thread</text>
      <text x="180" y="180" font-size="8.5" fill="#0284c7" text-anchor="middle">(Tied to specific Task & Sub-Branch)</text>

      <path class="flow-line" d="M 180 190 L 180 214" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Type Message & Attach File -->
      <polygon points="80,214 305,214 280,254 55,254" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="180" y="231" font-size="10" font-weight="700" fill="#0369a1" text-anchor="middle">Type Message & Attach Files</text>
      <text x="180" y="243" font-size="8.5" fill="#0284c7" text-anchor="middle">(Photos, Documents, Status Updates)</text>

      <path class="flow-line" d="M 180 254 L 180 278" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Broadcast to Participants -->
      <rect x="65" y="278" width="230" height="40" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="180" y="294" font-size="9.5" font-weight="800" fill="#854d0e" text-anchor="middle">System Transmits in Real Time;</text>
      <text x="180" y="307" font-size="8.5" fill="#a16207" text-anchor="middle">Unread Counter Increments for Team</text>

      <path class="flow-line" d="M 180 318 L 180 342" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Thread Archived in DB -->
      <rect x="65" y="342" width="230" height="40" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="180" y="358" font-size="9.5" font-weight="800" fill="#854d0e" text-anchor="middle">Permanently Stored in task_messages</text>
      <text x="180" y="371" font-size="8.5" fill="#b45309" text-anchor="middle">Contextual Conversation Preserved</text>

      <path class="flow-line" d="M 180 382 L 180 410" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- End Terminal -->
      <rect x="120" y="410" width="130" height="30" rx="15" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8"/>
      <text x="185" y="429" font-size="11" font-weight="800" fill="#9f1239" text-anchor="middle">Chat Synced ✔</text>

      <!-- ======================================================== -->
      <!-- FEATURE 2: TRANSFERS & HOLD / RESUME                     -->
      <!-- Center = 547px                                           -->
      <!-- ======================================================== -->

      <!-- Start Terminal -->
      <rect x="482" y="38" width="130" height="30" rx="15" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8"/>
      <text x="547" y="57" font-size="11" font-weight="800" fill="#9f1239" text-anchor="middle">Task Exception</text>

      <path class="flow-line" d="M 547 68 L 547 92" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Decision Diamond: Exception Type -->
      <polygon points="547,92 625,128 547,164 469,128" fill="#ffedd5" stroke="#ea580c" stroke-width="1.8"/>
      <text x="547" y="125" font-size="9.5" font-weight="800" fill="#9a3412" text-anchor="middle">Select Exception</text>
      <text x="547" y="137" font-size="9.5" font-weight="800" fill="#9a3412" text-anchor="middle">Procedure</text>

      <!-- Option A: Put on Hold (Left Sub-Lane) -->
      <path class="flow-line" d="M 469 128 L 440 128 L 440 180" stroke="#d97706" stroke-width="1.8" marker-end="url(#arr-black2)"/>
      <text x="430" y="116" font-size="8.5" font-weight="800" fill="#d97706">Client Delay</text>

      <!-- Click Put on Hold -->
      <polygon points="395,180 500,180 480,218 375,218" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="437" y="196" font-size="9" font-weight="700" fill="#0369a1" text-anchor="middle">Click 'Put on Hold'</text>
      <text x="437" y="208" font-size="7.5" fill="#0284c7" text-anchor="middle">Pauses Timer SLA</text>

      <path class="flow-line" d="M 437 218 L 437 240" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Stored in On Hold -->
      <rect x="380" y="240" width="125" height="38" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="442" y="256" font-size="9" font-weight="800" fill="#854d0e" text-anchor="middle">Stored in 'On Hold' Tab;</text>
      <text x="442" y="268" font-size="7.5" fill="#a16207" text-anchor="middle">Metrics SLA Protected</text>

      <path class="flow-line" d="M 442 278 L 442 302" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Resume Task -->
      <polygon points="395,302 505,302 485,340 375,340" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="440" y="318" font-size="9" font-weight="700" fill="#0369a1" text-anchor="middle">Client Ready: 'Resume'</text>
      <text x="440" y="330" font-size="7.5" fill="#0284c7" text-anchor="middle">Returns to 'In Progress'</text>

      <!-- Option B: Transfer Branch (Right Sub-Lane) -->
      <path class="flow-line" d="M 625 128 L 655 128 L 655 180" stroke="#2563eb" stroke-width="1.8" marker-end="url(#arr-black2)"/>
      <text x="650" y="116" font-size="8.5" font-weight="800" fill="#2563eb">Leave / Shift</text>

      <!-- Click Transfer Branch -->
      <polygon points="610,180 715,180 695,218 590,218" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="652" y="196" font-size="9" font-weight="700" fill="#0369a1" text-anchor="middle">Click 'Transfer Branch'</text>
      <text x="652" y="208" font-size="7.5" fill="#0284c7" text-anchor="middle">Pick replacement owner</text>

      <path class="flow-line" d="M 652 218 L 652 240" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Ownership Handover -->
      <rect x="585" y="240" width="130" height="38" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="650" y="256" font-size="9" font-weight="800" fill="#854d0e" text-anchor="middle">New Owner Assigned;</text>
      <text x="650" y="268" font-size="7.5" fill="#b45309" text-anchor="middle">Historical Logs Intact</text>

      <!-- Merge Lines from Hold and Transfer -->
      <path class="flow-line" d="M 440 340 L 440 376 L 547 376" stroke="#1e293b" stroke-width="1.8"/>
      <path class="flow-line" d="M 650 278 L 650 376 L 547 376" stroke="#1e293b" stroke-width="1.8"/>

      <path class="flow-line" d="M 547 376 L 547 410" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- End Terminal -->
      <rect x="477" y="410" width="140" height="30" rx="15" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8"/>
      <text x="547" y="429" font-size="11" font-weight="800" fill="#9f1239" text-anchor="middle">Exception Resolved ✔</text>

      <!-- ======================================================== -->
      <!-- FEATURE 3: AUDIT TRAIL & WORK LOGS                       -->
      <!-- Center = 917px                                           -->
      <!-- ======================================================== -->

      <!-- Start Terminal -->
      <rect x="852" y="38" width="130" height="30" rx="15" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8"/>
      <text x="917" y="57" font-size="11" font-weight="800" fill="#9f1239" text-anchor="middle">Audit Inspection</text>

      <path class="flow-line" d="M 917 68 L 917 92" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Open Work Logs -->
      <polygon points="825,92 1025,92 1005,128 805,128" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="915" y="108" font-size="10" font-weight="700" fill="#0369a1" text-anchor="middle">Open 'Work Logs' Page</text>
      <text x="915" y="120" font-size="8.5" fill="#0284c7" text-anchor="middle">Universal Audit Trail Directory</text>

      <path class="flow-line" d="M 915 128 L 915 152" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Filter Controls -->
      <polygon points="815,152 1030,152 1010,190 795,190" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="912" y="168" font-size="9.5" font-weight="700" fill="#0369a1" text-anchor="middle">Filter by Task Code, User Name,</text>
      <text x="912" y="180" font-size="8.5" fill="#0284c7" text-anchor="middle">Department, Status or Date Range</text>

      <path class="flow-line" d="M 912 190 L 912 214" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Fetch Activity Logs -->
      <rect x="800" y="214" width="230" height="40" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="915" y="230" font-size="9.5" font-weight="800" fill="#854d0e" text-anchor="middle">System Queries activity_logs Table</text>
      <text x="915" y="243" font-size="8" fill="#a16207" text-anchor="middle">Renders Chronological Timeline</text>

      <path class="flow-line" d="M 915 254 L 915 278" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Inspect Milestones -->
      <rect x="800" y="278" width="230" height="44" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="915" y="294" font-size="9" font-weight="700" fill="#854d0e" text-anchor="middle">Inspect Exactly Who Did What:</text>
      <text x="915" y="306" font-size="8" fill="#475569" text-anchor="middle">• Creation • Clarifications • Submissions</text>
      <text x="915" y="318" font-size="8" fill="#475569" text-anchor="middle">• Revision Returns • Final Sign-offs</text>

      <path class="flow-line" d="M 915 322 L 915 346" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Export CSV -->
      <polygon points="820,346 1025,346 1005,384 800,384" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="912" y="362" font-size="10" font-weight="700" fill="#0369a1" text-anchor="middle">Click 'Export CSV' Button</text>
      <text x="912" y="374" font-size="8.5" fill="#0284c7" text-anchor="middle">Download Reports for Client Invoicing</text>

      <path class="flow-line" d="M 912 384 L 912 410" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- End Terminal -->
      <rect x="852" y="410" width="130" height="30" rx="15" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8"/>
      <text x="917" y="429" font-size="11" font-weight="800" fill="#9f1239" text-anchor="middle">Audit Complete ✔</text>

      <!-- ======================================================== -->
      <!-- FEATURE 4: ADMIN CONTROLS & SECURITY                     -->
      <!-- Center = 1270px                                          -->
      <!-- ======================================================== -->

      <!-- Start Terminal -->
      <rect x="1205" y="38" width="130" height="30" rx="15" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8"/>
      <text x="1270" y="57" font-size="11" font-weight="800" fill="#9f1239" text-anchor="middle">Admin Controls</text>

      <path class="flow-line" d="M 1270 68 L 1270 92" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Decision Diamond: Admin Module -->
      <polygon points="1270,92 1345,128 1270,164 1195,128" fill="#ffedd5" stroke="#ea580c" stroke-width="1.8"/>
      <text x="1270" y="125" font-size="9.5" font-weight="800" fill="#9a3412" text-anchor="middle">Select Admin</text>
      <text x="1270" y="137" font-size="9.5" font-weight="800" fill="#9a3412" text-anchor="middle">Module</text>

      <!-- Option 1: Users & Depts (Left Sub-Lane) -->
      <path class="flow-line" d="M 1195 128 L 1170 128 L 1170 180" stroke="#2563eb" stroke-width="1.8" marker-end="url(#arr-black2)"/>
      <text x="1155" y="116" font-size="8.5" font-weight="800" fill="#2563eb">Users / Depts</text>

      <!-- Manage Users & Roles -->
      <polygon points="1120,180 1230,180 1210,218 1100,218" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="1165" y="196" font-size="9" font-weight="700" fill="#0369a1" text-anchor="middle">Create / Edit Users</text>
      <text x="1165" y="208" font-size="7.5" fill="#0284c7" text-anchor="middle">Assign Roles & Depts</text>

      <path class="flow-line" d="M 1165 218 L 1165 240" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Dept Setup Process -->
      <rect x="1105" y="240" width="125" height="38" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="1167" y="256" font-size="9" font-weight="800" fill="#854d0e" text-anchor="middle">Configure Departments</text>
      <text x="1167" y="268" font-size="7.5" fill="#b45309" text-anchor="middle">& Assign Lead Responsibles</text>

      <!-- Option 2: Impersonate (Right Sub-Lane) -->
      <path class="flow-line" d="M 1345 128 L 1370 128 L 1370 180" stroke="#7c3aed" stroke-width="1.8" marker-end="url(#arr-black2)"/>
      <text x="1360" y="116" font-size="8.5" font-weight="800" fill="#7c3aed">Impersonate</text>

      <!-- Click Log in as User -->
      <polygon points="1310,180 1420,180 1400,218 1290,218" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="1355" y="196" font-size="9" font-weight="700" fill="#0369a1" text-anchor="middle">Click 'Log in as User'</text>
      <text x="1355" y="208" font-size="7.5" fill="#0284c7" text-anchor="middle">Inspect live employee view</text>

      <path class="flow-line" d="M 1355 218 L 1355 240" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Click Switch Back -->
      <polygon points="1310,240 1420,240 1400,278 1290,278" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="1355" y="256" font-size="9" font-weight="700" fill="#0369a1" text-anchor="middle">Click 'Switch Back'</text>
      <text x="1355" y="268" font-size="7.5" fill="#0284c7" text-anchor="middle">Instantly return to Admin</text>

      <!-- Merge Lines from Admin modules -->
      <path class="flow-line" d="M 1165 278 L 1165 310 L 1270 310" stroke="#1e293b" stroke-width="1.8"/>
      <path class="flow-line" d="M 1355 278 L 1355 310 L 1270 310" stroke="#1e293b" stroke-width="1.8"/>

      <path class="flow-line" d="M 1270 310 L 1270 334" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- Security Policy Enforced -->
      <rect x="1160" y="334" width="220" height="42" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="1270" y="351" font-size="9.5" font-weight="800" fill="#854d0e" text-anchor="middle">Role-Based Security Enforced;</text>
      <text x="1270" y="364" font-size="8" fill="#b45309" text-anchor="middle">All Impersonations Logged in Audit Trail</text>

      <path class="flow-line" d="M 1270 376 L 1270 410" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr-black2)"/>

      <!-- End Terminal -->
      <rect x="1205" y="410" width="130" height="30" rx="15" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8"/>
      <text x="1270" y="429" font-size="11" font-weight="800" fill="#9f1239" text-anchor="middle">Security Intact ✔</text>

    </svg>
  </div>

  <div class="diagram-footer">
    <span>QuickLifeNow Enterprise Systems • Production Reference</span>
    <span>Master Flowchart 2: Operations, Collaboration & Administration</span>
    <span>Page 2 of 3</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 3: REFERENCE ARCHITECTURE, STATE MACHINE & USER GUIDE MATRIX   -->
<!-- =================================================================== -->
<div class="page">
  <div class="diagram-header">
    <div class="header-left">
      <div class="logo-icon">Q</div>
      <div class="header-title-box">
        <h1>QuickLifeNow Task Management — Reference Architecture & System Manual</h1>
        <p>State Machine Transition Table, 6-Level Hierarchy Rules, Role Access Permissions & Symbology Guide</p>
      </div>
    </div>
    <div class="diagram-legend">
      <span>Production Blueprint • Release v1.0.0</span>
    </div>
  </div>

  <div class="canvas-container" style="border: 1.5px solid #cbd5e1; padding: 4px;">
    <div class="manual-grid">

      <!-- Card 1: State Machine Transitions -->
      <div class="manual-card">
        <h2><span>🔄</span> Task State Machine & Status Lifecycle</h2>
        <table class="manual-table">
          <thead>
            <tr>
              <th style="width: 25%;">Status State</th>
              <th style="width: 35%;">Trigger / Action</th>
              <th style="width: 40%;">System Behavior & Visibility</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="badge-status bg-blue">New / Pending</span></td>
              <td>Creator clicks 'Create Task'</td>
              <td>Dispatches alerts, generates sub-branches, enters Assignee queue.</td>
            </tr>
            <tr>
              <td><span class="badge-status bg-blue">In Progress</span></td>
              <td>Assignee opens task & begins work</td>
              <td>Active timer running; assignee prepares deliverables.</td>
            </tr>
            <tr>
              <td><span class="badge-status bg-amber">Waiting Details</span></td>
              <td>Assignee clicks 'Request Details'</td>
              <td>Assignee timer pauses; Assigner receives urgent question notification.</td>
            </tr>
            <tr>
              <td><span class="badge-status bg-purple">Under Review</span></td>
              <td>Assignee clicks 'Submit for Review'</td>
              <td>Leaves Assignee queue; enters Reviewer's 'Review Queue' page.</td>
            </tr>
            <tr>
              <td><span class="badge-status bg-rose">Needs Correction</span></td>
              <td>Reviewer clicks 'Return for Revision'</td>
              <td>Returned to Assignee with mandatory correction notes; rework required.</td>
            </tr>
            <tr>
              <td><span class="badge-status bg-green">Approved</span></td>
              <td>Reviewer clicks 'Approve Submission'</td>
              <td>Branch marked approved; waits for sibling branches to complete.</td>
            </tr>
            <tr>
              <td><span class="badge-status bg-amber">On Hold</span></td>
              <td>User clicks 'Put on Hold' (client delay)</td>
              <td>SLA frozen to protect employee metrics; stored in 'On Hold' tab.</td>
            </tr>
            <tr>
              <td><span class="badge-status bg-green">Completed</span></td>
              <td>Creator clicks 'Final Sign-Off'</td>
              <td>100% complete; milestone locked and archived permanently in Work Logs.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Card 2: 6-Level Hierarchy & Branch Naming Convention -->
      <div class="manual-card">
        <h2><span>🌳</span> 6-Level Delegation Hierarchy & Isolation</h2>
        <table class="manual-table">
          <thead>
            <tr>
              <th style="width: 20%;">Level</th>
              <th style="width: 25%;">Branch Code</th>
              <th style="width: 25%;">Ownership</th>
              <th style="width: 30%;">Visibility Scope</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Level 1</b></td>
              <td><code>T-0010</code></td>
              <td>Original Creator</td>
              <td>Global visibility across all child branches.</td>
            </tr>
            <tr>
              <td><b>Level 2</b></td>
              <td><code>QL-0010.1</code></td>
              <td>Lead Assignee A</td>
              <td>Sees only Branch .1 and its children (.1.1).</td>
            </tr>
            <tr>
              <td><b>Level 2 (Parallel)</b></td>
              <td><code>QL-0010.2</code></td>
              <td>Lead Assignee B</td>
              <td>Strictly isolated from Lead A; sees only Branch .2.</td>
            </tr>
            <tr>
              <td><b>Level 3</b></td>
              <td><code>QL-0010.1.1</code></td>
              <td>Senior Specialist</td>
              <td>Delegated sub-task; reports up to Lead A.</td>
            </tr>
            <tr>
              <td><b>Level 4</b></td>
              <td><code>QL-0010.1.1.1</code></td>
              <td>Junior Team Member</td>
              <td>Sub-component work; reports up to Senior.</td>
            </tr>
            <tr>
              <td><b>Levels 5 & 6</b></td>
              <td><code>...1.1.1.1.1</code></td>
              <td>Deep Specialists</td>
              <td>Deep leaf nodes; complete horizontal privacy.</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 6px; padding: 5px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 8.5px; color: #475569;">
          <b>Horizontal Isolation Rule:</b> An employee assigned to <code>QL-0010.1</code> has ZERO access to <code>QL-0010.2</code>. Only the parent who delegated the task and the original creator can see the child branches.
        </div>
      </div>

      <!-- Card 3: Role-Based Access Control (RBAC) -->
      <div class="manual-card">
        <h2><span>🛡️</span> Role Permissions & Access Matrix</h2>
        <table class="manual-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Task Creation</th>
              <th>Delegation</th>
              <th>Review / Sign-Off</th>
              <th>Admin / Impersonate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Super Admin</b></td>
              <td>Full (All Depts)</td>
              <td>Full (Up to L6)</td>
              <td>Final Sign-Off Any</td>
              <td>Full Control + Impersonate</td>
            </tr>
            <tr>
              <td><b>Admin</b></td>
              <td>Full (All Depts)</td>
              <td>Full (Up to L6)</td>
              <td>Final Sign-Off Any</td>
              <td>Manage Users & Depts</td>
            </tr>
            <tr>
              <td><b>Sub-Admin / Lead</b></td>
              <td>Own Department</td>
              <td>Delegate to Team</td>
              <td>Review Team Work</td>
              <td>Department-Only View</td>
            </tr>
            <tr>
              <td><b>Employee</b></td>
              <td>Can Request Task</td>
              <td>Delegate if Lead</td>
              <td>Self Submit Work</td>
              <td>No Admin Access</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Card 4: Flowchart Symbology & User Guide -->
      <div class="manual-card">
        <h2><span>📐</span> Flowchart Symbology & User Guide</h2>
        <table class="manual-table">
          <thead>
            <tr>
              <th style="width: 25%;">Symbol</th>
              <th style="width: 25%;">Color & Shape</th>
              <th style="width: 50%;">Usage Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Terminal</b></td>
              <td><span class="pill-sample" style="display:inline-block; vertical-align:middle;"></span> Soft Pink Pill</td>
              <td>Indicates where a workflow starts, ends, or reaches final completion.</td>
            </tr>
            <tr>
              <td><b>User Action / Input</b></td>
              <td><span class="para-sample" style="display:inline-block; vertical-align:middle;"></span> Sky Blue Parallelogram</td>
              <td>A human user action (clicking a button, entering form text, uploading files).</td>
            </tr>
            <tr>
              <td><b>System Process</b></td>
              <td><span class="rect-sample" style="display:inline-block; vertical-align:middle;"></span> Warm Yellow Rectangle</td>
              <td>An automated server execution (creating records, token checks, firing alerts).</td>
            </tr>
            <tr>
              <td><b>Decision Condition</b></td>
              <td><span class="dia-sample" style="display:inline-block; vertical-align:middle;"></span> Soft Peach Diamond</td>
              <td>A branch point asking a question with labeled <b>Yes</b> (green) or <b>No</b> (red) paths.</td>
            </tr>
            <tr>
              <td><b>Junction Point</b></td>
              <td><code>⨂</code> Circled Cross</td>
              <td>Where orthogonal flow lines cleanly transition into the next stage or loop.</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>

  <div class="diagram-footer">
    <span>QuickLifeNow Enterprise Systems • Production Reference</span>
    <span>Master Reference Architecture & User Manual</span>
    <span>Page 3 of 3</span>
  </div>
</div>

</body>
</html>
`;

// Write HTML
const htmlPath = path.resolve('QuickLifeNow_Complete_System_Flowcharts.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('HTML written to:', htmlPath);

// Generate PDF using Chrome Headless
const pdfPath = path.resolve('QuickLifeNow_Complete_System_Flowcharts.pdf');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log('Rendering vector PDF via Chrome Headless...');
const cmd = '"' + chromePath + '" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="' + pdfPath + '" "file:///' + htmlPath.replace(/\\/g, '/') + '"';

try {
  execSync(cmd, { stdio: 'inherit' });
  const stats = fs.statSync(pdfPath);
  console.log('SUCCESS: Generated PDF (' + (stats.size / 1024).toFixed(1) + ' KB) at:', pdfPath);
} catch (err) {
  console.error('PDF generation error:', err.message);
}
