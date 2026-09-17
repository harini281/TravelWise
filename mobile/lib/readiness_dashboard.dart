import 'dart:convert';

import 'package:flutter/material.dart';
import 'api_client.dart' as http;

import 'config.dart';

class ReadinessDashboard extends StatefulWidget {
  const ReadinessDashboard({
    super.key,
    required this.tripId,
  });

  final int tripId;

  @override
  State<ReadinessDashboard> createState() =>
      _ReadinessDashboardState();
}

class _ReadinessDashboardState
    extends State<ReadinessDashboard> {
  final String apiUrl = AppConfig.apiBaseUrl;

  List<dynamic> requirements = [];
  List<dynamic> checklist = [];

  Map<String, dynamic>? assessment;

  bool loading = true;
  bool assessing = false;

  String error = '';

  @override
  void initState() {
    super.initState();
    loadReadiness();
  }

  Future<void> loadReadiness() async {
    try {
      setState(() {
        loading = true;
        error = '';
      });

      final response = await http.get(
        Uri.parse(
          '$apiUrl/api/Readiness/trip/${widget.tripId}',
        ),
      );

      if (response.statusCode != 200) {
        throw Exception(
          'Failed to load readiness information. '
          'Status: ${response.statusCode}',
        );
      }

      final data = jsonDecode(response.body);

      setState(() {
        requirements =
            (data['requirements'] ?? data['travelRequirements'] ?? []) as List<dynamic>;
        checklist =
            (data['items'] ?? data['readinessItems'] ?? []) as List<dynamic>;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  Future<void> assessReadiness() async {
    try {
      setState(() {
        assessing = true;
        error = '';
      });

      final response = await http.post(
        Uri.parse(
          '$apiUrl/api/Readiness/assess/trip/${widget.tripId}',
        ),
      );

      if (response.statusCode < 200 ||
          response.statusCode >= 300) {
        throw Exception(
          'Readiness assessment failed. '
          'Status: ${response.statusCode}. '
          '${response.body}',
        );
      }

      setState(() {
        assessment = jsonDecode(response.body);
      });

      await loadReadiness();
    } catch (e) {
      setState(() {
        error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          assessing = false;
        });
      }
    }
  }

  String getItemName(dynamic item) {
    return item['name']?.toString() ??
        item['title']?.toString() ??
        item['requirementName']?.toString() ??
        'Readiness Item';
  }

  String getStatus(dynamic item) {
    return item['status']?.toString() ?? 'UNKNOWN';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Travel Document & Readiness Management',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),

        const SizedBox(height: 20),

        if (error.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(
              bottom: 15,
            ),
            child: Text(
              error,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),

        ElevatedButton(
          onPressed:
              assessing ? null : assessReadiness,
          child: Text(
            assessing
                ? 'Assessing...'
                : 'Assess Readiness',
          ),
        ),

        const SizedBox(height: 25),

        const Text(
          'Travel Requirements',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),

        const SizedBox(height: 10),

        if (loading)
          const CircularProgressIndicator()
        else if (requirements.isEmpty)
          const Text(
            'No travel requirements found.',
          )
        else
          ...requirements.map(
            (requirement) => Card(
              child: ListTile(
                title: Text(
                  getItemName(requirement),
                ),
                subtitle: Text(
                  'Status: ${getStatus(requirement)}',
                ),
              ),
            ),
          ),

        const SizedBox(height: 25),

        const Text(
          'Readiness Checklist',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),

        const SizedBox(height: 10),

        if (!loading && checklist.isEmpty)
          const Text(
            'No readiness checklist items found.',
          )
        else if (!loading)
          ...checklist.map(
            (item) => Card(
              child: ListTile(
                leading: Icon(
                  getStatus(item) == 'COMPLETED'
                      ? Icons.check_circle
                      : Icons.pending,
                ),
                title: Text(
                  getItemName(item),
                ),
                subtitle: Text(
                  'Status: ${getStatus(item)}',
                ),
              ),
            ),
          ),

        const SizedBox(height: 25),

        const Text(
          'Readiness Assessment',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),

        const SizedBox(height: 10),

        if (assessment == null)
          const Text(
            'No readiness assessment completed yet.',
          )
        else
          Card(
            child: Padding(
              padding: const EdgeInsets.all(15),
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  Text(
                    'Readiness Score: '
                    '${assessment!['readinessScore'] ?? '-'}',
                  ),

                  Text(
                    'Status: '
                    '${assessment!['readinessLevel'] ?? assessment!['status'] ?? assessment!['readinessStatus'] ?? '-'}',
                  ),

                  const SizedBox(height: 10),

                  Text(
                    'Summary: '
                    '${assessment!['summary'] ?? '-'}',
                  ),
                ],
              ),
            ),
          ),

        const SizedBox(height: 15),

        ElevatedButton(
          onPressed: loadReadiness,
          child: const Text(
            'Refresh Readiness',
          ),
        ),
      ],
    );
  }
}