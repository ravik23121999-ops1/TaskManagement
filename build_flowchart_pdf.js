const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building human-grade engineering flowchart PDF...');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>QuickLifeNow - Task Management System Flowchart</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');

  @page {
    size: A4 landscape;
    margin: 8mm 10mm;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    font-family: 'Segoe UI', 'Inter', -apple-system, sans-serif;
    color: #1e293b;
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 11px;
  }

  .page {
    width: 100%;
    height: 100vh;
    max-height: 194mm;
    padding: 12px 16px;
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
    align-items: flex-end;
    border-bottom: 2px solid #334155;
    padding-bottom: 6px;
    margin-bottom: 8px;
  }

  .diagram-title-group h1 {
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .diagram-title-group p {
    font-size: 10px;
    color: #475569;
    margin: 2px 0 0 0;
    font-weight: 500;
  }

  .diagram-legend-compact {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 9.5px;
    font-weight: 600;
    color: #334155;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    padding: 4px 10px;
    border-radius: 6px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .pill-sample {
    width: 18px;
    height: 10px;
    border-radius: 5px;
    background: #ffe4e6;
    border: 1.2px solid #e11d48;
  }

  .para-sample {
    width: 16px;
    height: 10px;
    background: #e0f2fe;
    border: 1.2px solid #0284c7;
    transform: skewX(-15deg);
  }

  .rect-sample {
    width: 16px;
    height: 10px;
    background: #fef9c3;
    border: 1.2px solid #ca8a04;
    border-radius: 2px;
  }

  .dia-sample {
    width: 10px;
    height: 10px;
    background: #ffedd5;
    border: 1.2px solid #ea580c;
    transform: rotate(45deg);
  }

  /* SVG Canvas Box */
  .canvas-box {
    flex: 1;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }

  .canvas-box svg {
    width: 100%;
    height: 100%;
    max-height: 168mm;
  }

  /* Footer */
  .diagram-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #cbd5e1;
    padding-top: 4px;
    margin-top: 6px;
    font-size: 8.5px;
    color: #64748b;
    font-weight: 600;
  }
</style>
</head>
<body>

<!-- =================================================================== -->
<!-- PAGE 1: MASTER SYSTEM FLOWCHART (Full-Page Classic Engineering)     -->
<!-- =================================================================== -->
<div class="page">
  <div class="diagram-header">
    <div class="diagram-title-group">
      <h1>QuickLifeNow Task Management — End-to-End System Flowchart</h1>
      <p>Complete lifecycle from user login & task creation to execution, clarification, review, and final sign-off</p>
    </div>
    <div class="diagram-legend-compact">
      <div class="legend-item"><span class="pill-sample"></span> Start / End</div>
      <div class="legend-item"><span class="para-sample"></span> User Action / Input</div>
      <div class="legend-item"><span class="rect-sample"></span> Work & System Process</div>
      <div class="legend-item"><span class="dia-sample"></span> Decision Point</div>
    </div>
  </div>

  <div class="canvas-box">
    <svg viewBox="0 0 1120 620" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Standard Arrow Marker -->
        <marker id="arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e293b"/>
        </marker>
        <marker id="arr-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#dc2626"/>
        </marker>
        <marker id="arr-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#16a34a"/>
        </marker>
      </defs>

      <!-- Grid Column Header Banners -->
      <rect x="25" y="8" width="310" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
      <text x="180" y="24" font-size="11" font-weight="700" fill="#334155" text-anchor="middle">STAGE 1: LOGIN & TASK CREATION</text>

      <rect x="390" y="8" width="340" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
      <text x="560" y="24" font-size="11" font-weight="700" fill="#334155" text-anchor="middle">STAGE 2: DELEGATION & EXECUTION</text>

      <rect x="785" y="8" width="310" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
      <text x="940" y="24" font-size="11" font-weight="700" fill="#334155" text-anchor="middle">STAGE 3: REVIEW & FINAL SIGN-OFF</text>

      <!-- ======================================================== -->
      <!-- COLUMN 1: INITIATION & TASK CREATION                      -->
      <!-- ======================================================== -->

      <!-- Start (Oval) -->
      <rect x="120" y="42" width="120" height="34" rx="17" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8"/>
      <text x="180" y="63" font-size="12" font-weight="700" fill="#9f1239" text-anchor="middle">Start</text>

      <!-- Arrow down -->
      <path d="M 180 76 L 180 98" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Step 1: Login (Parallelogram) -->
      <polygon points="90,98 280,98 260,138 70,138" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="175" y="116" font-size="11" font-weight="600" fill="#0369a1" text-anchor="middle">User Logs In with Role</text>
      <text x="175" y="129" font-size="9.5" fill="#0369a1" text-anchor="middle">(Admin, Sub-Admin, Employee)</text>

      <!-- Arrow down -->
      <path d="M 175 138 L 175 158" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Step 2: Dashboard View (Rectangle) -->
      <rect x="80" y="158" width="190" height="36" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="175" y="174" font-size="10.5" font-weight="600" fill="#854d0e" text-anchor="middle">Dashboard Displays Metrics</text>
      <text x="175" y="186" font-size="9" fill="#a16207" text-anchor="middle">& Action Queues</text>

      <!-- Arrow down -->
      <path d="M 175 194 L 175 214" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Step 3: Click New Task (Parallelogram) -->
      <polygon points="90,214 270,214 250,252 70,252" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="170" y="231" font-size="11" font-weight="600" fill="#0369a1" text-anchor="middle">Creator clicks '+ New Task'</text>
      <text x="170" y="244" font-size="9.5" fill="#0369a1" text-anchor="middle">Opens Creation Form</text>

      <!-- Arrow down -->
      <path d="M 170 252 L 170 272" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Step 4: Fill Details (Parallelogram) -->
      <polygon points="85,272 275,272 255,316 65,316" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="170" y="289" font-size="10.5" font-weight="600" fill="#0369a1" text-anchor="middle">Enter Title, Department,</text>
      <text x="170" y="301" font-size="10.5" font-weight="600" fill="#0369a1" text-anchor="middle">Priority & Due Date</text>
      <text x="170" y="312" font-size="9" fill="#0284c7" text-anchor="middle">Attach reference files if any</text>

      <!-- Arrow down -->
      <path d="M 170 316 L 170 336" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Step 5: Select 1 or More Assignees (Parallelogram) -->
      <polygon points="80,336 280,336 260,378 60,378" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="170" y="353" font-size="10.5" font-weight="600" fill="#0369a1" text-anchor="middle">Select 1 or More Assignees</text>
      <text x="170" y="366" font-size="9.5" fill="#0284c7" text-anchor="middle">(1-to-Many: Lead 1, Lead 2)</text>

      <!-- Arrow down -->
      <path d="M 170 378 L 170 398" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Step 6: System Generation (Rectangle) -->
      <rect x="65" y="398" width="210" height="42" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="170" y="415" font-size="10.5" font-weight="600" fill="#854d0e" text-anchor="middle">System Generates Task Code</text>
      <text x="170" y="428" font-size="10" font-weight="700" fill="#b45309" text-anchor="middle">(e.g. T-010) & Root Task</text>

      <!-- Arrow down -->
      <path d="M 170 440 L 170 460" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Step 7: Sub-branches Created (Rectangle) -->
      <rect x="65" y="460" width="210" height="42" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="170" y="477" font-size="10.5" font-weight="600" fill="#854d0e" text-anchor="middle">Creates Sub-Branches 1.1 & 1.2</text>
      <text x="170" y="490" font-size="9.5" fill="#a16207" text-anchor="middle">Sends Real-time Alerts</text>

      <!-- Arrow right to Junction 1 -->
      <path d="M 275 481 L 348 481" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Junction Circle 1 (X) -->
      <circle cx="360" cy="481" r="12" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
      <line x1="352" y1="473" x2="368" y2="489" stroke="#1e293b" stroke-width="1.8"/>
      <line x1="368" y1="473" x2="352" y2="489" stroke="#1e293b" stroke-width="1.8"/>

      <!-- Connector line up into Column 2 -->
      <path d="M 360 469 L 360 60 L 460 60" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- ======================================================== -->
      <!-- COLUMN 2: EXECUTION & QUESTION CLARIFICATION LOOP         -->
      <!-- ======================================================== -->

      <!-- Step 8: Assignee Receives Task (Rectangle) -->
      <rect x="460" y="42" width="200" height="36" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="560" y="58" font-size="10.5" font-weight="600" fill="#854d0e" text-anchor="middle">Assignee Opens Task in</text>
      <text x="560" y="71" font-size="10" font-weight="700" fill="#b45309" text-anchor="middle">'My Action Required'</text>

      <!-- Arrow down -->
      <path d="M 560 78 L 560 102" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Decision 1: Delegate Further? (Diamond) -->
      <polygon points="560,102 650,140 560,178 470,140" fill="#ffedd5" stroke="#ea580c" stroke-width="1.8"/>
      <text x="560" y="136" font-size="10.5" font-weight="700" fill="#9a3412" text-anchor="middle">Need to Delegate</text>
      <text x="560" y="148" font-size="10.5" font-weight="700" fill="#9a3412" text-anchor="middle">to Junior Team?</text>

      <!-- Decision 1: YES (Right branch) -->
      <path d="M 650 140 L 705 140 L 705 190" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>
      <text x="670" y="132" font-size="10" font-weight="800" fill="#16a34a">Yes</text>

      <!-- Action: Delegate Work (Parallelogram) -->
      <polygon points="630,190 755,190 735,228 610,228" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="682" y="206" font-size="10" font-weight="600" fill="#0369a1" text-anchor="middle">Click 'Delegate Work'</text>
      <text x="682" y="218" font-size="9" fill="#0284c7" text-anchor="middle">Create 1.1.1, 1.1.2</text>

      <!-- Loop from delegation back to working queue -->
      <path d="M 682 228 L 682 250 L 590 250" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Decision 1: NO (Down) -->
      <path d="M 560 178 L 560 220" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>
      <text x="568" y="196" font-size="10" font-weight="800" fill="#dc2626">No</text>

      <!-- Step 9: Review Requirements (Rectangle) -->
      <rect x="465" y="220" width="190" height="38" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="560" y="236" font-size="10.5" font-weight="600" fill="#854d0e" text-anchor="middle">Assignee Reviews Task Goals,</text>
      <text x="560" y="249" font-size="9.5" fill="#a16207" text-anchor="middle">Criteria & Instructions</text>

      <!-- Arrow down -->
      <path d="M 560 258 L 560 280" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Decision 2: Clear or Questions? (Diamond) -->
      <polygon points="560,280 655,320 560,360 465,320" fill="#ffedd5" stroke="#ea580c" stroke-width="1.8"/>
      <text x="560" y="316" font-size="10" font-weight="700" fill="#9a3412" text-anchor="middle">Are Instructions</text>
      <text x="560" y="328" font-size="10" font-weight="700" fill="#9a3412" text-anchor="middle">100% Clear?</text>

      <!-- Decision 2: NO (Left question loop) -->
      <path d="M 465 320 L 415 320 L 415 348" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>
      <text x="430" y="312" font-size="10" font-weight="800" fill="#dc2626">No</text>

      <!-- Action: Request Missing Details (Parallelogram) -->
      <polygon points="340,348 460,348 440,388 320,388" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="390" y="364" font-size="9.5" font-weight="600" fill="#0369a1" text-anchor="middle">Click 'Request Details'</text>
      <text x="390" y="377" font-size="8.5" fill="#0369a1" text-anchor="middle">Ask Assigner specific Q</text>

      <!-- Process: Assigner Responds (Rectangle) -->
      <path d="M 390 388 L 390 410" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>
      <rect x="320" y="410" width="140" height="38" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="390" y="426" font-size="9.5" font-weight="600" fill="#854d0e" text-anchor="middle">Assigner Provides</text>
      <text x="390" y="439" font-size="8.5" fill="#a16207" text-anchor="middle">Answer & Clarification</text>

      <!-- Loop back from question to review -->
      <path d="M 320 429 L 295 429 L 295 240 L 465 240" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Decision 2: YES (Down to Active Work) -->
      <path d="M 560 360 L 560 388" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>
      <text x="568" y="376" font-size="10" font-weight="800" fill="#16a34a">Yes</text>

      <!-- Step 10: Active Execution (Rectangle) -->
      <rect x="465" y="388" width="190" height="38" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="560" y="405" font-size="10.5" font-weight="600" fill="#854d0e" text-anchor="middle">Assignee Executes Work &</text>
      <text x="560" y="418" font-size="9.5" fill="#a16207" text-anchor="middle">Prepares Final Files</text>

      <!-- Arrow down -->
      <path d="M 560 426 L 560 450" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Step 11: Submit Deliverables (Parallelogram) -->
      <polygon points="465,450 675,450 655,496 445,496" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="560" y="468" font-size="10.5" font-weight="600" fill="#0369a1" text-anchor="middle">Attach Deliverables (PDF, ZIP)</text>
      <text x="560" y="482" font-size="10" font-weight="700" fill="#0369a1" text-anchor="middle">& Click 'Submit for Review'</text>

      <!-- Arrow right to Junction 2 -->
      <path d="M 665 473 L 738 473" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Junction Circle 2 (X) -->
      <circle cx="750" cy="473" r="12" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
      <line x1="742" y1="465" x2="758" y2="481" stroke="#1e293b" stroke-width="1.8"/>
      <line x1="758" y1="465" x2="742" y2="481" stroke="#1e293b" stroke-width="1.8"/>

      <!-- Connector line up into Column 3 -->
      <path d="M 750 461 L 750 60 L 850 60" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- ======================================================== -->
      <!-- COLUMN 3: REVIEW, REVISION LOOP & FINAL SIGN-OFF          -->
      <!-- ======================================================== -->

      <!-- Step 12: Review Queue (Rectangle) -->
      <rect x="850" y="42" width="190" height="36" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="945" y="58" font-size="10.5" font-weight="600" fill="#854d0e" text-anchor="middle">Task Enters Reviewer's</text>
      <text x="945" y="71" font-size="10" font-weight="700" fill="#b45309" text-anchor="middle">'Review Queue' Page</text>

      <!-- Arrow down -->
      <path d="M 945 78 L 945 100" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Step 13: Inspect Files (Parallelogram) -->
      <polygon points="855,100 1055,100 1035,140 835,140" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="945" y="117" font-size="10.5" font-weight="600" fill="#0369a1" text-anchor="middle">Reviewer Downloads Files &</text>
      <text x="945" y="130" font-size="9.5" fill="#0284c7" text-anchor="middle">Inspects Deliverable Quality</text>

      <!-- Arrow down -->
      <path d="M 945 140 L 945 162" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Decision 3: Meets Standards? (Diamond) -->
      <polygon points="945,162 1045,200 945,238 845,200" fill="#ffedd5" stroke="#ea580c" stroke-width="1.8"/>
      <text x="945" y="196" font-size="10" font-weight="700" fill="#9a3412" text-anchor="middle">Meets Quality</text>
      <text x="945" y="208" font-size="10" font-weight="700" fill="#9a3412" text-anchor="middle">Standards?</text>

      <!-- Decision 3: NO -> Return for Revision (Left Loop back to Column 2 Execution) -->
      <path d="M 845 200 L 780 200 L 780 405 L 655 405" stroke="#dc2626" stroke-width="1.8" marker-end="url(#arr-red)"/>
      <text x="805" y="192" font-size="10" font-weight="800" fill="#dc2626">No</text>
      <text x="735" y="340" font-size="9" font-weight="700" fill="#dc2626" transform="rotate(-90 735 340)">Return for Revision with Notes</text>

      <!-- Decision 3: YES -> Mark Branch Approved (Down) -->
      <path d="M 945 238 L 945 268" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arr-green)"/>
      <text x="953" y="254" font-size="10" font-weight="800" fill="#16a34a">Yes</text>

      <!-- Process: Branch Approved (Rectangle) -->
      <rect x="855" y="268" width="180" height="34" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="945" y="284" font-size="10.5" font-weight="700" fill="#854d0e" text-anchor="middle">Branch Marked Approved ✔</text>
      <text x="945" y="295" font-size="8.5" fill="#a16207" text-anchor="middle">(Logged in Activity Trail)</text>

      <!-- Arrow down -->
      <path d="M 945 302 L 945 324" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Decision 4: All Sibling Branches Done? (Diamond) -->
      <polygon points="945,324 1045,362 945,400 845,362" fill="#ffedd5" stroke="#ea580c" stroke-width="1.8"/>
      <text x="945" y="358" font-size="10" font-weight="700" fill="#9a3412" text-anchor="middle">All Sibling Branches</text>
      <text x="945" y="370" font-size="10" font-weight="700" fill="#9a3412" text-anchor="middle">Fully Approved?</text>

      <!-- Decision 4: NO -> Wait in Waiting on Others (Right branch) -->
      <path d="M 1045 362 L 1090 362 L 1090 285 L 1035 285" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>
      <text x="1055" y="354" font-size="9.5" font-weight="800" fill="#dc2626">No</text>
      <text x="1075" y="325" font-size="8.5" font-weight="600" fill="#475569" transform="rotate(90 1075 325)">Waiting on Remaining</text>

      <!-- Decision 4: YES -> Creator Final Sign-off (Down) -->
      <path d="M 945 400 L 945 428" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arr-green)"/>
      <text x="953" y="415" font-size="10" font-weight="800" fill="#16a34a">Yes</text>

      <!-- Step 14: Creator Final Sign-off (Parallelogram) -->
      <polygon points="850,428 1060,428 1040,470 830,470" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
      <text x="945" y="446" font-size="10.5" font-weight="700" fill="#0369a1" text-anchor="middle">Task Creator Inspects All Work</text>
      <text x="945" y="459" font-size="10.5" font-weight="700" fill="#0284c7" text-anchor="middle">& Clicks 'Final Sign-Off'</text>

      <!-- Arrow down -->
      <path d="M 945 470 L 945 496" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- Step 15: Status Completed (Rectangle) -->
      <rect x="850" y="496" width="190" height="36" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="945" y="512" font-size="10.5" font-weight="700" fill="#854d0e" text-anchor="middle">Status Updated to 'Completed'</text>
      <text x="945" y="525" font-size="9" fill="#a16207" text-anchor="middle">Archived in Work Logs Permanently</text>

      <!-- Arrow down -->
      <path d="M 945 532 L 945 558" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr)"/>

      <!-- End Terminal (Oval) -->
      <rect x="880" y="558" width="130" height="34" rx="17" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8"/>
      <text x="945" y="579" font-size="12" font-weight="700" fill="#9f1239" text-anchor="middle">Goal Done ✔</text>

    </svg>
  </div>

  <div class="diagram-footer">
    <span>QuickLifeNow Enterprise Core System • Production Reference Flowchart</span>
    <span>Diagram 1: End-to-End Task Lifecycle Flowchart</span>
    <span>Page 1 of 3</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 2: HIERARCHICAL 6-LEVEL DELEGATION & REVISION LOOPS            -->
<!-- =================================================================== -->
<div class="page">
  <div class="diagram-header">
    <div class="diagram-title-group">
      <h1>QuickLifeNow — Hierarchical Delegation & Question / Revision Loops</h1>
      <p>How 6-level delegation tree numbering works and how the two core feedback exception loops guarantee zero confusion</p>
    </div>
    <div class="diagram-legend-compact">
      <div class="legend-item"><span class="pill-sample"></span> Start / End</div>
      <div class="legend-item"><span class="para-sample"></span> User Action / Input</div>
      <div class="legend-item"><span class="rect-sample"></span> Work & System Process</div>
      <div class="legend-item"><span class="dia-sample"></span> Decision Point</div>
    </div>
  </div>

  <div class="canvas-box">
    <svg viewBox="0 0 1120 620" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e293b"/>
        </marker>
        <marker id="arr-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563eb"/>
        </marker>
      </defs>

      <!-- SECTION A: LEFT (50%) - 6-LEVEL HIERARCHY TREE LOGIC -->
      <rect x="25" y="8" width="510" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
      <text x="280" y="24" font-size="11" font-weight="700" fill="#334155" text-anchor="middle">PART A: HIERARCHICAL TASK NUMBERING & DELEGATION TREE</text>

      <!-- Level 1 Root Box -->
      <rect x="180" y="46" width="200" height="46" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
      <text x="280" y="64" font-size="11" font-weight="800" fill="#1e40af" text-anchor="middle">LEVEL 1: ROOT TASK (QL-0010)</text>
      <text x="280" y="77" font-size="9.5" font-weight="600" fill="#3b82f6" text-anchor="middle">Task Creator / Manager (e.g. Karan Sharma)</text>
      <text x="280" y="88" font-size="8.5" fill="#64748b" text-anchor="middle">Full Ownership • Final Sign-off Authority</text>

      <!-- Split Arrows from Level 1 to Level 2 -->
      <path d="M 280 92 L 280 112 L 140 112 L 140 128" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr2)"/>
      <path d="M 280 112 L 420 112 L 420 128" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr2)"/>

      <!-- Level 2 Branch 1.1 -->
      <rect x="50" y="128" width="180" height="42" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="140" y="145" font-size="10.5" font-weight="700" fill="#854d0e" text-anchor="middle">LEVEL 2: BRANCH QL-0010.1</text>
      <text x="140" y="157" font-size="9" font-weight="600" fill="#b45309" text-anchor="middle">Assignee 1 (e.g. Checker Lead)</text>
      <text x="140" y="167" font-size="8.5" fill="#a16207" text-anchor="middle">Isolated deliverable scope</text>

      <!-- Level 2 Branch 1.2 -->
      <rect x="330" y="128" width="180" height="42" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.8"/>
      <text x="420" y="145" font-size="10.5" font-weight="700" fill="#854d0e" text-anchor="middle">LEVEL 2: BRANCH QL-0010.2</text>
      <text x="420" y="157" font-size="9" font-weight="600" fill="#b45309" text-anchor="middle">Assignee 2 (e.g. Reviewer Lead)</text>
      <text x="420" y="167" font-size="8.5" fill="#a16207" text-anchor="middle">Independent timeline</text>

      <!-- Split Arrows from Level 2 to Level 3 -->
      <path d="M 140 170 L 140 190 L 80 190 L 80 206" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr2)"/>
      <path d="M 140 190 L 200 190 L 200 206" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr2)"/>

      <!-- Level 3 Branch 1.1.1 -->
      <rect x="25" y="206" width="110" height="38" rx="4" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>
      <text x="80" y="222" font-size="9" font-weight="700" fill="#166534" text-anchor="middle">LEVEL 3: 1.1.1</text>
      <text x="80" y="233" font-size="8" fill="#15803d" text-anchor="middle">Member 1 (Data Prep)</text>

      <!-- Level 3 Branch 1.1.2 -->
      <rect x="145" y="206" width="110" height="38" rx="4" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>
      <text x="200" y="222" font-size="9" font-weight="700" fill="#166534" text-anchor="middle">LEVEL 3: 1.1.2</text>
      <text x="200" y="233" font-size="8" fill="#15803d" text-anchor="middle">Member 2 (Validation)</text>

      <!-- Dotted Line down to Level 6 Explanation -->
      <path d="M 80 244 L 80 280 L 140 280 L 140 310" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arr2)"/>
      <path d="M 200 244 L 200 280 L 140 280" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3"/>

      <!-- Level 4 to 6 Recursive Explanation Box -->
      <rect x="35" y="310" width="220" height="74" rx="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
      <text x="145" y="328" font-size="10" font-weight="800" fill="#0f172a" text-anchor="middle">EXPANDS UP TO 6 FULL LEVELS</text>
      <text x="145" y="342" font-size="9" font-weight="600" fill="#475569" text-anchor="middle">Level 4: <code>QL-0010.1.1.1</code> (Field Auditor)</text>
      <text x="145" y="356" font-size="9" font-weight="600" fill="#475569" text-anchor="middle">Level 5: <code>QL-0010.1.1.1.1</code> (Inventory)</text>
      <text x="145" y="370" font-size="9" font-weight="600" fill="#475569" text-anchor="middle">Level 6: <code>QL-0010.1.1.1.1.1</code> (Ledger)</text>

      <!-- Merge Back arrows showing child review flow up to parent -->
      <path d="M 255 347 L 380 347 L 380 200 L 420 200 L 420 170" stroke="#2563eb" stroke-width="1.8" marker-end="url(#arr-blue)"/>
      <text x="330" y="338" font-size="8.5" font-weight="700" fill="#2563eb" text-anchor="middle">Approval bubbles upward</text>

      <!-- Key Rules Callout Card -->
      <rect x="25" y="405" width="510" height="195" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="40" y="425" font-size="11" font-weight="800" fill="#0f172a">Hierarchy Rules & Permission Guardrails:</text>

      <text x="40" y="445" font-size="10" font-weight="700" fill="#1e293b">1. Strict Horizontal Isolation:</text>
      <text x="55" y="458" font-size="9.5" fill="#475569">Lead 1 (1.1) cannot view or modify deliverables belonging to Lead 2 (1.2). Work is focused and secure.</text>

      <text x="40" y="478" font-size="10" font-weight="700" fill="#1e293b">2. Automatic Roll-Up & Traceability:</text>
      <text x="55" y="491" font-size="9.5" fill="#475569">When a child sub-task (1.1.1) is submitted, it is reviewed by its direct parent (1.1). Sub-branches cannot bypass their lead.</text>

      <text x="40" y="511" font-size="10" font-weight="700" fill="#1e293b">3. Creator Sovereignty (Final Sign-off):</text>
      <text x="55" y="524" font-size="9.5" fill="#475569">Even if all sub-branches pass review, the task remains in 'In Progress' until the original Creator gives final sign-off.</text>

      <text x="40" y="544" font-size="10" font-weight="700" fill="#1e293b">4. Clean Tree Visualizer:</text>
      <text x="55" y="557" font-size="9.5" fill="#475569">Clicking the 'Workflow & 4-Level Flow' tab inside any task renders an interactive visual tree diagram in real time.</text>

      <!-- SECTION B: RIGHT (50%) - THE 2 ESSENTIAL EXCEPTION LOOPS -->
      <rect x="575" y="8" width="520" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
      <text x="835" y="24" font-size="11" font-weight="700" fill="#334155" text-anchor="middle">PART B: THE TWO CRITICAL FEEDBACK & EXCEPTION LOOPS</text>

      <!-- LOOP 1: QUESTION CLARIFICATION LOOP (Top Right) -->
      <rect x="585" y="42" width="500" height="240" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
      <rect x="585" y="42" width="500" height="22" rx="4" fill="#e0f2fe"/>
      <text x="835" y="57" font-size="10.5" font-weight="800" fill="#0369a1" text-anchor="middle">LOOP 1: 'REQUEST MISSING DETAILS' PROTOCOL (Pre-Execution)</text>

      <!-- Question Loop nodes -->
      <polygon points="610,75 750,75 730,110 590,110" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>
      <text x="670" y="91" font-size="9.5" font-weight="600" fill="#0369a1" text-anchor="middle">Assignee needs</text>
      <text x="670" y="103" font-size="9" fill="#0369a1" text-anchor="middle">files / clarification</text>

      <path d="M 740 92 L 778 92" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr2)"/>

      <polygon points="785,75 935,75 915,110 765,110" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>
      <text x="850" y="91" font-size="9.5" font-weight="600" fill="#0369a1" text-anchor="middle">Clicks 'Request Details'</text>
      <text x="850" y="103" font-size="8.5" fill="#0284c7" text-anchor="middle">Types exact question</text>

      <path d="M 925 92 L 960 92" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr2)"/>

      <rect x="960" y="75" width="115" height="35" rx="3" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.5"/>
      <text x="1017" y="90" font-size="9" font-weight="600" fill="#854d0e" text-anchor="middle">Task safely pauses;</text>
      <text x="1017" y="102" font-size="8" fill="#a16207" text-anchor="middle">Assigner alerted</text>

      <!-- Arrow down and back to Assigner answer -->
      <path d="M 1017 110 L 1017 135 L 940 135" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr2)"/>

      <polygon points="785,118 935,118 915,152 765,152" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>
      <text x="850" y="132" font-size="9.5" font-weight="600" fill="#0369a1" text-anchor="middle">Assigner Submits Answer</text>
      <text x="850" y="144" font-size="8.5" fill="#0284c7" text-anchor="middle">& uploads required file</text>

      <path d="M 765 135 L 670 135 L 670 110" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arr-green)"/>
      <text x="710" y="150" font-size="8.5" font-weight="700" fill="#16a34a">Task Resumes in 'My Action'</text>

      <!-- Loop 1 Summary Text -->
      <rect x="595" y="165" width="480" height="105" rx="4" fill="#f8fafc" stroke="#e2e8f0"/>
      <text x="610" y="182" font-size="9.5" font-weight="700" fill="#0f172a">Why This Protocol Matters:</text>
      <text x="610" y="198" font-size="9" fill="#475569">• Eliminates assumptions: Employees never deliver work based on incomplete guesses.</text>
      <text x="610" y="213" font-size="9" fill="#475569">• Timer Protection: Clarification questions pause SLA pressure so team metrics are never penalized.</text>
      <text x="610" y="228" font-size="9" fill="#475569">• Complete Log: The question and answer remain permanently attached to the task thread.</text>

      <!-- LOOP 2: REVIEW REVISION LOOP (Bottom Right) -->
      <rect x="585" y="300" width="500" height="300" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
      <rect x="585" y="300" width="500" height="22" rx="4" fill="#fef2f2"/>
      <text x="835" y="315" font-size="10.5" font-weight="800" fill="#991b1b" text-anchor="middle">LOOP 2: QUALITY REVIEW & CORRECTION LOOP (Post-Submission)</text>

      <!-- Review Loop nodes -->
      <polygon points="610,335 745,335 725,370 590,370" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>
      <text x="667" y="350" font-size="9.5" font-weight="600" fill="#0369a1" text-anchor="middle">Deliverable Submitted</text>
      <text x="667" y="362" font-size="8.5" fill="#0369a1" text-anchor="middle">Files in Review Queue</text>

      <path d="M 735 352 L 775 352" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr2)"/>

      <polygon points="780,330 870,352 780,375 690,352" fill="#ffedd5" stroke="#ea580c" stroke-width="1.5"/>
      <text x="780" y="350" font-size="9" font-weight="700" fill="#9a3412" text-anchor="middle">Passes Quality</text>
      <text x="780" y="360" font-size="9" font-weight="700" fill="#9a3412" text-anchor="middle">Standards?</text>

      <!-- Revision path (NO) -->
      <path d="M 870 352 L 910 352" stroke="#dc2626" stroke-width="1.8" marker-end="url(#arr-red)"/>
      <text x="885" y="345" font-size="9" font-weight="800" fill="#dc2626">No</text>

      <polygon points="915,335 1070,335 1050,370 895,370" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>
      <text x="982" y="350" font-size="9" font-weight="600" fill="#0369a1" text-anchor="middle">Click 'Return for Revision'</text>
      <text x="982" y="362" font-size="8.5" fill="#0284c7" text-anchor="middle">Write required changes</text>

      <!-- Return flow down and around -->
      <path d="M 982 370 L 982 405 L 830 405" stroke="#dc2626" stroke-width="1.8" marker-end="url(#arr-red)"/>

      <rect x="670" y="390" width="160" height="32" rx="3" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.5"/>
      <text x="750" y="405" font-size="9" font-weight="600" fill="#854d0e" text-anchor="middle">Assignee Notified with Feedback;</text>
      <text x="750" y="416" font-size="8" fill="#a16207" text-anchor="middle">Makes corrections and re-submits</text>

      <path d="M 670 405 L 635 405 L 635 370" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arr2)"/>

      <!-- Loop 2 Summary Text -->
      <rect x="595" y="435" width="480" height="155" rx="4" fill="#f8fafc" stroke="#e2e8f0"/>
      <text x="610" y="455" font-size="9.5" font-weight="700" fill="#0f172a">Quality Verification Rules:</text>
      <text x="610" y="473" font-size="9" fill="#475569">• Return Notes are Mandatory: Reviewers cannot reject work without explaining exactly what to fix.</text>
      <text x="610" y="490" font-size="9" fill="#475569">• Version History: Prior submissions and revision comments are preserved in the submission history.</text>
      <text x="610" y="507" font-size="9" fill="#475569">• Immediate Notification: Assignee receives an alert with the reviewer's exact remarks.</text>
      <text x="610" y="524" font-size="9" fill="#475569">• Approval Stamp: Once approved, the branch is locked against accidental modification.</text>
      <text x="610" y="541" font-size="9" fill="#475569">• Final Verification: Creator gives the ultimate sign-off once all branches meet approval.</text>

    </svg>
  </div>

  <div class="diagram-footer">
    <span>QuickLifeNow Enterprise Core System • Production Reference Flowchart</span>
    <span>Diagram 2: Hierarchical 6-Level Tree & Feedback Exception Loops</span>
    <span>Page 2 of 3</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 3: PRACTICAL USER MANUAL (How Anyone Uses the System)          -->
<!-- =================================================================== -->
<div class="page">
  <div class="diagram-header">
    <div class="diagram-title-group">
      <h1>QuickLifeNow Task Management — Operational User Manual</h1>
      <p>Step-by-step role guides for Task Creators, Assignees, and Quality Reviewers</p>
    </div>
    <div class="diagram-legend-compact">
      <div class="legend-item"><span style="color: #2563eb;">●</span> Creator Role</div>
      <div class="legend-item"><span style="color: #059669;">●</span> Assignee Role</div>
      <div class="legend-item"><span style="color: #7c3aed;">●</span> Reviewer Role</div>
    </div>
  </div>

  <div style="flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; min-height: 0; padding-top: 4px;">

    <!-- Card 1: Task Creator / Manager -->
    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 10px;">
          <div style="width: 24px; height: 24px; border-radius: 6px; background: #2563eb; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px;">1</div>
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a;">If You Are A Task Creator</div>
            <div style="font-size: 9.5px; color: #64748b; font-weight: 600;">Managers, Directors, Project Owners</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 10px;">
          <div>
            <strong style="color: #0f172a;">1. Click '+ New Task'</strong>
            <p style="margin: 2px 0 0 0; color: #475569; line-height: 1.4;">Located at top right and in the sidebar. Set a clear title, description, priority, and completion deadline.</p>
          </div>

          <div>
            <strong style="color: #0f172a;">2. Select Assignees (1 to Many)</strong>
            <p style="margin: 2px 0 0 0; color: #475569; line-height: 1.4;">Pick all team leads who will share responsibility. Each lead receives their own sub-branch (1.1, 1.2) automatically.</p>
          </div>

          <div>
            <strong style="color: #0f172a;">3. Monitor 'Waiting on Others'</strong>
            <p style="margin: 2px 0 0 0; color: #475569; line-height: 1.4;">Track which assignees have finished, which are in review, and who is currently working in real time.</p>
          </div>

          <div>
            <strong style="color: #0f172a;">4. Provide Final Sign-Off</strong>
            <p style="margin: 2px 0 0 0; color: #475569; line-height: 1.4;">When all sub-branches pass review, verify the combined deliverable and click <strong>Final Sign-Off</strong> to archive the task.</p>
          </div>
        </div>
      </div>

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 10px; font-size: 9px; color: #1e40af;">
        <strong>Creator Principle:</strong> You own the final seal. Team members cannot mark tasks complete until you verify deliverables.
      </div>
    </div>

    <!-- Card 2: Team Member / Assignee -->
    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 10px;">
          <div style="width: 24px; height: 24px; border-radius: 6px; background: #059669; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px;">2</div>
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a;">If You Are An Assignee</div>
            <div style="font-size: 9.5px; color: #64748b; font-weight: 600;">Engineers, Designers, Operations Staff</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 10px;">
          <div>
            <strong style="color: #0f172a;">1. Check 'My Action Required'</strong>
            <p style="margin: 2px 0 0 0; color: #475569; line-height: 1.4;">All tasks waiting on your step appear here. Review the requirements and due date as soon as you receive an alert.</p>
          </div>

          <div>
            <strong style="color: #0f172a;">2. Ask Questions Immediately</strong>
            <p style="margin: 2px 0 0 0; color: #475569; line-height: 1.4;">Never work on guesswork. Click <strong>Request Missing Details</strong> to ask for passwords, assets, or criteria clarification.</p>
          </div>

          <div>
            <strong style="color: #0f172a;">3. Delegate If Necessary</strong>
            <p style="margin: 2px 0 0 0; color: #475569; line-height: 1.4;">If you are leading a module, click <strong>Delegate Work</strong> to assign sub-tasks (1.1.1, 1.1.2) to junior members.</p>
          </div>

          <div>
            <strong style="color: #0f172a;">4. Submit Work & Attachments</strong>
            <p style="margin: 2px 0 0 0; color: #475569; line-height: 1.4;">Attach your finished files (PDF, ZIP, DOCX, Code) and click <strong>Submit Work for Review</strong> with a clear summary note.</p>
          </div>
        </div>
      </div>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 10px; font-size: 9px; color: #166534;">
        <strong>Assignee Principle:</strong> Always attach proof of work directly through the submission modal for fast reviewer approval.
      </div>
    </div>

    <!-- Card 3: Quality Reviewer -->
    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; margin-bottom: 10px;">
          <div style="width: 24px; height: 24px; border-radius: 6px; background: #7c3aed; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px;">3</div>
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a;">If You Are A Reviewer</div>
            <div style="font-size: 9.5px; color: #64748b; font-weight: 600;">QA Leads, Department Heads, Checkers</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 10px;">
          <div>
            <strong style="color: #0f172a;">1. Monitor 'Review Queue'</strong>
            <p style="margin: 2px 0 0 0; color: #475569; line-height: 1.4;">All submissions waiting for quality approval appear here with submitter name, department, and submission timestamp.</p>
          </div>

          <div>
            <strong style="color: #0f172a;">2. Download & Verify Attachments</strong>
            <p style="margin: 2px 0 0 0; color: #475569; line-height: 1.4;">Inspect files carefully against the original acceptance criteria. Check for errors, completeness, and formatting.</p>
          </div>

          <div>
            <strong style="color: #0f172a;">3. Approve or Return with Notes</strong>
            <p style="margin: 2px 0 0 0; color: #475569; line-height: 1.4;">If satisfactory, click <strong>Approve</strong>. If changes are required, click <strong>Return for Revision</strong> and state specific fixes.</p>
          </div>

          <div>
            <strong style="color: #0f172a;">4. Traceability & Audit Logs</strong>
            <p style="margin: 2px 0 0 0; color: #475569; line-height: 1.4;">Every decision is recorded in the permanent audit trail. Reviewers maintain accountability for work quality.</p>
          </div>
        </div>
      </div>

      <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 8px 10px; font-size: 9px; color: #6b21a8;">
        <strong>Reviewer Principle:</strong> Constructive revision notes ensure team members learn and make exact fixes on the first attempt.
      </div>
    </div>

  </div>

  <div class="diagram-footer">
    <span>QuickLifeNow Enterprise Core System • Production Reference Flowchart</span>
    <span>Operational User Manual (Roles & Golden Rules)</span>
    <span>Page 3 of 3</span>
  </div>
</div>

</body>
</html>
`;

// Write HTML
const htmlPath = path.resolve('QuickLifeNow_Complete_System_Flowcharts.html');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('HTML Flowchart written to:', htmlPath);

// Render PDF via Chrome Headless
const pdfPath = path.resolve('QuickLifeNow_Complete_System_Flowcharts.pdf');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log('Rendering vector PDF via Google Chrome Headless Engine...');
const cmd = '"' + chromePath + '" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="' + pdfPath + '" "file:///' + htmlPath.replace(/\\/g, '/') + '"';

try {
  execSync(cmd, { stdio: 'inherit' });

  if (fs.existsSync(pdfPath)) {
    const stats = fs.statSync(pdfPath);
    console.log('=====================================================');
    console.log('SUCCESS! Real Engineering Flowchart PDF Generated:');
    console.log('Path:', pdfPath);
    console.log('Size:', (stats.size / 1024).toFixed(1), 'KB');
    console.log('=====================================================');
  } else {
    console.error('ERROR: PDF file was not created.');
  }
} catch (err) {
  console.error('PDF Generation Failed:', err.message);
}
