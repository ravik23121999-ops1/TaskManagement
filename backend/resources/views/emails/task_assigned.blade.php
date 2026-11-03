<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ $subjectTitle ?? 'Task Assignment Notification' }}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 32px 16px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 24px 32px;
      color: #ffffff;
    }
    .header-logo {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #38bdf8;
      display: inline-block;
      margin-bottom: 8px;
    }
    .header-title {
      font-size: 20px;
      font-weight: 700;
      margin: 0;
      color: #f8fafc;
    }
    .badge-code {
      display: inline-block;
      padding: 3px 8px;
      background-color: rgba(56, 189, 248, 0.2);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      margin-top: 6px;
    }
    .body {
      padding: 32px;
    }
    .greeting {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .intro {
      font-size: 14px;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .assigner-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
    }
    .details-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .details-table tr:not(:last-child) td {
      border-bottom: 1px solid #f1f5f9;
    }
    .details-table td {
      padding: 12px 16px;
      font-size: 13px;
    }
    .details-label {
      width: 35%;
      color: #64748b;
      font-weight: 600;
      background-color: #f8fafc;
    }
    .details-value {
      width: 65%;
      color: #0f172a;
      font-weight: 600;
    }
    .instructions-box {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      border-radius: 4px 12px 12px 4px;
      padding: 16px;
      margin-bottom: 28px;
    }
    .instructions-title {
      font-size: 12px;
      font-weight: 700;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .instructions-content {
      font-size: 13px;
      color: #1e3a8a;
      line-height: 1.6;
      margin: 0;
      white-space: pre-wrap;
    }
    .cta-container {
      text-align: center;
      margin-bottom: 28px;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div class="header-logo">⚡ TaskHub Enterprise</div>
        <h1 class="header-title">{{ $emailHeading ?? 'New Task Assigned' }}</h1>
        <div class="badge-code">{{ $taskCode }}</div>
      </div>

      <!-- Body -->
      <div class="body">
        <div class="greeting">Hello {{ $assignee->name }},</div>

        <p class="intro">
          @if(($type ?? 'new_assignment') === 'transferred')
            The following subtask assignment has been transferred to you by <strong>{{ $assigner->name }}</strong>. Please review the scope and deliverables below:
          @else
            You have been assigned to work on the following task by <strong>{{ $assigner->name }}</strong> ({{ ucwords(str_replace('_', ' ', $assigner->role ?? 'Assigner')) }}).
          @endif
        </p>

        <!-- Details Table -->
        <table class="details-table">
          <tr>
            <td class="details-label">Overall Task</td>
            <td class="details-value">{{ $task->title }}</td>
          </tr>
          @if(!empty($branchTitle) && $branchTitle !== $task->title)
          <tr>
            <td class="details-label">Your Subtask Scope</td>
            <td class="details-value">{{ $branchTitle }}</td>
          </tr>
          @endif
          <tr>
            <td class="details-label">Priority</td>
            <td class="details-value">
              <span style="color: {{ $task->priority === 'urgent' ? '#dc2626' : ($task->priority === 'high' ? '#e11d48' : '#2563eb') }};">
                {{ strtoupper($task->priority ?? 'MEDIUM') }}
              </span>
            </td>
          </tr>
          <tr>
            <td class="details-label">Due Date</td>
            <td class="details-value">
              {{ $dueDate ? date('M d, Y', strtotime($dueDate)) : 'No strict deadline' }}
            </td>
          </tr>
          <tr>
            <td class="details-label">Delegated By</td>
            <td class="details-value">{{ $assigner->name }} ({{ $assigner->email }})</td>
          </tr>
        </table>

        <!-- Instructions Box -->
        @if(!empty($instructions))
        <div class="instructions-box">
          <div class="instructions-title">Instructions & Scope</div>
          <div class="instructions-content">{{ $instructions }}</div>
        </div>
        @endif

        @if(!empty($note))
        <div class="instructions-box" style="background-color: #fefce8; border-left-color: #eab308;">
          <div class="instructions-title" style="color: #854d0e;">Assigner Note</div>
          <div class="instructions-content" style="color: #713f12;">{{ $note }}</div>
        </div>
        @endif

        <!-- CTA Button -->
        <div class="cta-container">
          <a href="{{ $taskUrl }}" class="cta-button" target="_blank">
            Open Task in TaskHub &rarr;
          </a>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">
          Direct link: <a href="{{ $taskUrl }}" style="color: #2563eb;">{{ $taskUrl }}</a>
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        TaskHub Management System &bull; Automated notification sent on behalf of {{ $assigner->name }}.<br>
        Please log into your dashboard to update progress, collaborate, or submit deliverables.
      </div>
    </div>
  </div>
</body>
</html>
