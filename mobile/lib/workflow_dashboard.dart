import 'dart:convert';

import 'package:flutter/material.dart';
import 'api_client.dart' as http;

import 'config.dart';

class WorkflowDashboard extends StatefulWidget {
  const WorkflowDashboard({
    super.key,
    required this.tripId,
    this.user,
  });

  final int tripId;
  final Map<String, dynamic>? user;

  @override
  State<WorkflowDashboard> createState() => _WorkflowDashboardState();
}

class _WorkflowDashboardState extends State<WorkflowDashboard> {
  final String apiUrl = AppConfig.apiBaseUrl;

  final TextEditingController commentController = TextEditingController();

  Map<String, dynamic>? workflow;
  Map<String, dynamic>? aiResult;
  bool loading = true;
  bool processing = false;
  String error = '';
  String message = '';

  @override
  void initState() {
    super.initState();
    loadWorkflow();
  }

  @override
  void dispose() {
    commentController.dispose();
    super.dispose();
  }

  Future<void> loadWorkflow() async {
    try {
      setState(() {
        loading = true;
        error = '';
        message = '';
      });

      final response = await http.get(
        Uri.parse('$apiUrl/api/Workflow/trip/${widget.tripId}'),
      );

      if (response.statusCode == 404) {
        setState(() {
          workflow = null;
          aiResult = null;
          loading = false;
        });
        return;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception(
          'Failed to load workflow. Status: ${response.statusCode}',
        );
      }

      final data = jsonDecode(response.body);

      if (data is List) {
        if (data.isEmpty) {
          setState(() {
            workflow = null;
            aiResult = null;
            loading = false;
          });
        } else {
          setState(() {
            workflow = Map<String, dynamic>.from(data.last);
            loading = false;
          });
        }
      } else if (data is Map) {
        setState(() {
          workflow = Map<String, dynamic>.from(data);
          loading = false;
        });
      } else {
        setState(() {
          workflow = null;
          aiResult = null;
          loading = false;
        });
      }
    } catch (e) {
      setState(() {
        error = e.toString().replaceAll('Exception: ', '');
        loading = false;
      });
    }
  }

  Future<void> runIntelligentPlan() async {
    try {
      setState(() {
        processing = true;
        error = '';
        message = '';
      });

      final headers = {'Content-Type': 'application/json'};
      if (widget.user?['token'] != null) {
        headers['Authorization'] = 'Bearer ${widget.user!['token']}';
      }

      final response = await http.post(
        Uri.parse('$apiUrl/api/Workflow/trip/${widget.tripId}/run'),
        headers: headers,
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception(
          'Failed to run AI workflow. Status: ${response.statusCode}. ${response.body}',
        );
      }

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      setState(() {
        if (data['workflow'] != null) {
          workflow = Map<String, dynamic>.from(data['workflow']);
        }
        if (data['aiResult'] != null) {
          aiResult = Map<String, dynamic>.from(data['aiResult']);
        }
        message = 'Intelligent travel plan generated successfully. Awaiting human review.';
      });
    } catch (e) {
      setState(() {
        error = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          processing = false;
        });
      }
    }
  }

  Future<void> submitDecision(String decision) async {
    if (workflow == null) return;

    if (widget.user == null) {
      setState(() {
        error = 'You must log in to submit a review decision.';
      });
      return;
    }

    try {
      setState(() {
        processing = true;
        error = '';
        message = '';
      });

      final reviewer = widget.user!['email']?.toString() ??
          widget.user!['username']?.toString() ??
          'Reviewer';

      final workflowId = workflow!['id'];
      final response = await http.post(
        Uri.parse('$apiUrl/api/Workflow/$workflowId/approval'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.user!['token']}',
        },
        body: jsonEncode({
          'decision': decision,
          'reviewer': reviewer,
          'comment': commentController.text.trim().isNotEmpty
              ? commentController.text.trim()
              : (decision == 'APPROVE' ? 'Approved by reviewer.' : 'Review decision submitted.'),
        }),
      );

      if (response.statusCode == 401) {
        throw Exception('Authentication required. Please log in.');
      }
      if (response.statusCode == 403) {
        throw Exception('You do not have permission to perform this action. Only Reviewers and Administrators may approve workflows.');
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception('Failed to process approval: ${response.body}');
      }

      final data = jsonDecode(response.body);
      setState(() {
        workflow = Map<String, dynamic>.from(data);
        message = 'Workflow decision submitted: $decision (Status: ${data['status']})';
        commentController.clear();
      });
    } catch (e) {
      setState(() {
        error = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          processing = false;
        });
      }
    }
  }

  Widget buildAgentCard(String agentKey, String title, String fallbackTask, IconData icon) {
    final agentData = aiResult?['agent_results']?[agentKey] as Map<String, dynamic>?;
    final isFallback = agentData?['is_fallback'] == true || agentData?['status'] == 'FALLBACK_DETERMINISTIC';
    final status = isFallback
        ? 'Fallback deterministic'
        : agentData?['status']?.toString() ?? 'Pending';
    final analysis = agentData?['analysis'] as Map<String, dynamic>?;

    Color chipBg = isFallback ? Colors.amber.shade100 : (status == 'SUCCESS' ? Colors.green.shade100 : Colors.grey.shade200);
    Color chipFg = isFallback ? Colors.amber.shade900 : (status == 'SUCCESS' ? Colors.green.shade900 : Colors.grey.shade800);

    return Card(
      elevation: 1,
      color: isFallback ? const Color(0xFF40372C) : const Color(0xFF112C38),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: isFallback ? Colors.amber.shade300 : Colors.grey.shade300),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(icon, size: 18, color: Colors.blueGrey),
                    const SizedBox(width: 6),
                    Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: chipBg,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    status,
                    style: TextStyle(color: chipFg, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              fallbackTask,
              style: TextStyle(color: const Color(0xFFB9CDD2), fontSize: 12),
            ),
            const SizedBox(height: 8),
            if (analysis != null) ...[
              if (agentKey == 'budget') ...[
                Text('Total Budget: LKR ${analysis['total_budget']}'),
                Text('Spent: LKR ${analysis['total_spent']} (${analysis['spending_percentage']}%)'),
                Text('Remaining: LKR ${analysis['remaining_budget']}'),
                Text('Health: ${analysis['health']}', style: const TextStyle(fontWeight: FontWeight.bold)),
              ] else if (agentKey == 'activity') ...[
                Text('Planned Activities: ${analysis['activity_count']}'),
                Text('Recommendation: ${analysis['recommendation']}'),
              ] else if (agentKey == 'risk') ...[
                Text('Risk Score: ${analysis['risk_score']} / 100'),
                Text('Risk Level: ${analysis['risk_level']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                Text('Weather: ${analysis['summary']}'),
              ] else if (agentKey == 'readiness') ...[
                Text('Readiness Score: ${analysis['readiness_score']}%'),
                Text('Status: ${analysis['readiness_level']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                Text('Summary: ${analysis['summary']}'),
              ],
            ] else
              Text(
                'Ready for execution',
                style: TextStyle(color: Colors.grey.shade500, fontStyle: FontStyle.italic, fontSize: 12),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isSafeFailure = workflow?['status'] == 'SAFE_FAILURE' ||
        workflow?['status'] == 'EXTERNAL_SERVICE_FAILED' ||
        aiResult?['workflow_status'] == 'SAFE_FAILURE';

    final isReviewerOrAdmin = widget.user?['role'] == 'Reviewer' || widget.user?['role'] == 'Admin';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'AI Workflow & Governance',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFABD7E5),
                foregroundColor: Colors.white,
              ),
              onPressed: processing ? null : runIntelligentPlan,
              icon: const Icon(Icons.bolt),
              label: Text(processing ? 'Executing...' : '⚡ Run Intelligent Plan'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (error.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(10),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF402C32),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red.shade300),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.red, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    error,
                    style: TextStyle(color: Colors.red.shade900),
                  ),
                ),
              ],
            ),
          ),
        if (message.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(10),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF173C35),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.green.shade300),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle_outline, color: Colors.green, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    message,
                    style: TextStyle(color: Colors.green.shade900),
                  ),
                ),
              ],
            ),
          ),
        if (isSafeFailure)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 14),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              border: Border.all(color: Colors.amber.shade700, width: 1.5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.warning_amber_rounded, color: Colors.amber.shade900, size: 24),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Safe Failure Notice',
                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.amber.shade900),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'AI service is temporarily unavailable. Deterministic safety checks were completed where possible. AI-generated recommendations are unavailable. Human review is required.',
                        style: TextStyle(fontSize: 13, color: Colors.amber.shade900),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        if (loading)
          const Center(child: CircularProgressIndicator())
        else if (workflow == null)
          Card(
            margin: const EdgeInsets.only(bottom: 16),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('No workflow instance has been executed for this trip yet.'),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: processing ? null : runIntelligentPlan,
                    icon: const Icon(Icons.play_arrow),
                    label: Text(
                      processing ? 'Executing...' : 'Run Initial Planning Workflow',
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          Card(
            margin: const EdgeInsets.only(bottom: 16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Workflow status overview
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Workflow #${workflow!['id']}',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: workflow!['status'] == 'COMPLETED' ? Colors.green.shade100 : Colors.amber.shade100,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          workflow!['status']?.toString() ?? '',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: workflow!['status'] == 'COMPLETED' ? Colors.green.shade900 : Colors.amber.shade900,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  infoRow('Approval Status', '${workflow!['approvalStatus'] ?? '-'}'),
                  infoRow(
                    'Validation Passed',
                    workflow!['validationPassed'] == true ? 'PASSED' : 'FAILED',
                  ),
                  if (workflow!['reviewer'] != null)
                    infoRow('Reviewer', workflow!['reviewer'].toString()),
                  if (workflow!['approvalComment'] != null)
                    infoRow('Approval Comment', workflow!['approvalComment'].toString()),
                  infoRow('Created', formatDateTime(workflow!['createdAt'])),
                  infoRow('Last Updated', formatDateTime(workflow!['updatedAt'])),

                  const Divider(height: 28),

                  // 4 Agent Cards
                  const Text(
                    'Specialized AI Planning Agents',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 10),
                  buildAgentCard('budget', 'Budget Agent', 'Analyzes spending velocity and category allocations.', Icons.account_balance_wallet),
                  buildAgentCard('activity', 'Activity Agent', 'Evaluates itinerary scheduling and conflicts.', Icons.hiking),
                  buildAgentCard('risk', 'Risk Agent', 'Synthesizes live weather telemetry and travel safety.', Icons.shield),
                  buildAgentCard('readiness', 'Readiness Agent', 'Validates documents, visas, and pre-departure tasks.', Icons.checklist),

                  const Divider(height: 28),

                  // Human review & governance section
                  const Text(
                    '🛡️ Human-in-the-Loop Review',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),

                  if (isReviewerOrAdmin) ...[
                    Text(
                      'Authenticated as ${widget.user!['role']} (${widget.user!['email'] ?? widget.user!['username']}). You have authority to review and approve or reject this plan.',
                      style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: commentController,
                      decoration: const InputDecoration(
                        labelText: 'Reviewer Comment / Rationale',
                        border: OutlineInputBorder(),
                        hintText: 'Enter review feedback or decision notes...',
                      ),
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF91DDBF),
                            foregroundColor: Colors.white,
                          ),
                          onPressed: (processing || workflow!['status'] == 'COMPLETED')
                              ? null
                              : () => submitDecision('APPROVE'),
                          icon: const Icon(Icons.check),
                          label: const Text('✓ Approve Plan'),
                        ),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFF2AAA5),
                            foregroundColor: Colors.white,
                          ),
                          onPressed: processing ? null : () => submitDecision('REJECT'),
                          icon: const Icon(Icons.close),
                          label: const Text('✕ Reject Plan'),
                        ),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.orange.shade800,
                            foregroundColor: Colors.white,
                          ),
                          onPressed: processing ? null : () => submitDecision('REVISE'),
                          icon: const Icon(Icons.replay),
                          label: const Text('↺ Request Revision'),
                        ),
                        OutlinedButton.icon(
                          onPressed: processing ? null : loadWorkflow,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Refresh'),
                        ),
                      ],
                    ),
                  ] else ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF173641),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.lock_outline, color: const Color(0xFFB9CDD2), size: 22),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              '🔒 Approval controls are restricted to Reviewers and Administrators. You are currently viewing as ${widget.user != null ? widget.user!['role'] : 'Guest (Not Logged In)'}. Log in as Reviewer or Admin using the Authentication panel above.',
                              style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  String formatDateTime(dynamic value) {
    if (value == null) return '-';
    try {
      final date = DateTime.parse(value.toString()).toLocal();
      return '${date.month}/${date.day}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return value.toString();
    }
  }
}
