import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class WorkflowDashboard extends StatefulWidget {
  const WorkflowDashboard({
    super.key,
    required this.tripId,
  });

  final int tripId;

  @override
  State<WorkflowDashboard> createState() => _WorkflowDashboardState();
}

class _WorkflowDashboardState extends State<WorkflowDashboard> {
  final String apiUrl = 'http://localhost:5179';

  final TextEditingController reviewerController = TextEditingController();
  final TextEditingController commentController = TextEditingController();

  Map<String, dynamic>? workflow;
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
    reviewerController.dispose();
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
            loading = false;
          });
        } else {
          // Use latest workflow
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
          loading = false;
        });
      }
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  Future<void> createWorkflow() async {
    try {
      setState(() {
        processing = true;
        error = '';
        message = '';
      });

      final response = await http.post(
        Uri.parse('$apiUrl/api/Workflow'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'tripId': widget.tripId}),
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception(
          'Failed to create workflow. Status: ${response.statusCode}. ${response.body}',
        );
      }

      final data = jsonDecode(response.body);
      setState(() {
        workflow = Map<String, dynamic>.from(data);
        message = 'AI Workflow created successfully.';
      });
    } catch (e) {
      setState(() {
        error = e.toString();
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

    final reviewer = reviewerController.text.trim();
    if (reviewer.isEmpty) {
      setState(() {
        error = 'Please enter reviewer name.';
      });
      return;
    }

    try {
      setState(() {
        processing = true;
        error = '';
        message = '';
      });

      final workflowId = workflow!['id'];
      final response = await http.post(
        Uri.parse('$apiUrl/api/Workflow/$workflowId/approval'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'decision': decision,
          'reviewer': reviewer,
          'comment': commentController.text.trim(),
        }),
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception(
          'Failed to process approval: ${response.body}',
        );
      }

      final data = jsonDecode(response.body);
      setState(() {
        workflow = Map<String, dynamic>.from(data);
        message = 'Workflow decision submitted: $decision';
        commentController.clear();
      });
    } catch (e) {
      setState(() {
        error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          processing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'AI Workflow & Human Approval',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        if (error.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(10),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red.shade300),
            ),
            child: Text(
              'Error: $error',
              style: TextStyle(color: Colors.red.shade900),
            ),
          ),
        if (message.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(10),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.green.shade300),
            ),
            child: Text(
              message,
              style: TextStyle(color: Colors.green.shade900),
            ),
          ),
        if (loading)
          const Center(child: CircularProgressIndicator())
        else if (workflow == null)
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('No workflow exists for this trip.'),
              const SizedBox(height: 12),
              ElevatedButton.icon(
                onPressed: processing ? null : createWorkflow,
                icon: const Icon(Icons.play_arrow),
                label: Text(
                  processing ? 'Creating...' : 'Create AI Workflow',
                ),
              ),
            ],
          )
        else
          Card(
            margin: const EdgeInsets.only(bottom: 16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  infoRow('Workflow ID', '${workflow!['id']}'),
                  infoRow('Trip ID', '${workflow!['tripId']}'),
                  infoRow('Workflow Status', '${workflow!['status'] ?? '-'}'),
                  infoRow(
                    'Validation Passed',
                    workflow!['validationPassed'] == true ? 'Yes' : 'No',
                  ),
                  infoRow(
                    'Approval Status',
                    '${workflow!['approvalStatus'] ?? '-'}',
                  ),
                  infoRow(
                    'Reviewer',
                    workflow!['reviewer']?.toString() ?? 'Not reviewed',
                  ),
                  infoRow(
                    'Approval Comment',
                    workflow!['approvalComment']?.toString() ?? 'No comment',
                  ),
                  infoRow(
                    'Created',
                    formatDateTime(workflow!['createdAt']),
                  ),
                  infoRow(
                    'Last Updated',
                    formatDateTime(workflow!['updatedAt']),
                  ),
                  const Divider(height: 30),
                  const Text(
                    'Human Review & Approval',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: reviewerController,
                    decoration: const InputDecoration(
                      labelText: 'Reviewer Name',
                      border: OutlineInputBorder(),
                      hintText: 'Enter reviewer name',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: commentController,
                    decoration: const InputDecoration(
                      labelText: 'Review Comment',
                      border: OutlineInputBorder(),
                      hintText: 'Enter review comment',
                    ),
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green.shade700,
                          foregroundColor: Colors.white,
                        ),
                        onPressed:
                            processing ? null : () => submitDecision('APPROVE'),
                        icon: const Icon(Icons.check),
                        label: const Text('Approve'),
                      ),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red.shade700,
                          foregroundColor: Colors.white,
                        ),
                        onPressed:
                            processing ? null : () => submitDecision('REJECT'),
                        icon: const Icon(Icons.close),
                        label: const Text('Reject'),
                      ),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange.shade800,
                          foregroundColor: Colors.white,
                        ),
                        onPressed:
                            processing ? null : () => submitDecision('REVISE'),
                        icon: const Icon(Icons.replay),
                        label: const Text('Request Revision'),
                      ),
                      OutlinedButton.icon(
                        onPressed: processing ? null : loadWorkflow,
                        icon: const Icon(Icons.refresh),
                        label: const Text('Refresh Workflow'),
                      ),
                    ],
                  ),
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
