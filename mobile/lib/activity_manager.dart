import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class ActivityManager extends StatefulWidget {
  const ActivityManager({
    super.key,
    required this.tripId,
  });

  final int tripId;

  @override
  State<ActivityManager> createState() => _ActivityManagerState();
}

class _ActivityManagerState extends State<ActivityManager> {
  final String apiUrl = 'http://localhost:5179';

  final TextEditingController nameController = TextEditingController();
  final TextEditingController descriptionController = TextEditingController();
  final TextEditingController locationController = TextEditingController();
  final TextEditingController costController = TextEditingController();
  final TextEditingController durationController = TextEditingController();
  final TextEditingController startController = TextEditingController();
  final TextEditingController endController = TextEditingController();

  String category = 'Hiking';
  String status = 'PLANNED';

  List<dynamic> activities = [];

  bool loading = true;
  bool saving = false;
  String error = '';

  int? editingId;

  @override
  void initState() {
    super.initState();
    loadActivities();
  }

  @override
  void dispose() {
    nameController.dispose();
    descriptionController.dispose();
    locationController.dispose();
    costController.dispose();
    durationController.dispose();
    startController.dispose();
    endController.dispose();
    super.dispose();
  }

  Future<void> loadActivities() async {
    try {
      setState(() {
        loading = true;
        error = '';
      });

      final response = await http.get(
        Uri.parse(
          '$apiUrl/api/Activities/trip/${widget.tripId}',
        ),
      );

      if (response.statusCode != 200) {
        throw Exception(
          'Failed to load activities. Status: ${response.statusCode}',
        );
      }

      setState(() {
        activities = jsonDecode(response.body);
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  Future<void> saveActivity() async {
    if (nameController.text.trim().isEmpty ||
        locationController.text.trim().isEmpty ||
        costController.text.trim().isEmpty ||
        durationController.text.trim().isEmpty ||
        startController.text.trim().isEmpty ||
        endController.text.trim().isEmpty) {
      setState(() {
        error = 'Please complete all required fields.';
      });
      return;
    }

    try {
      setState(() {
        saving = true;
        error = '';
      });

      final body = {
        'tripId': widget.tripId,
        'name': nameController.text.trim(),
        'category': category,
        'description': descriptionController.text.trim(),
        'location': locationController.text.trim(),
        'estimatedCost': double.parse(costController.text),
        'durationMinutes': int.parse(durationController.text),
        'scheduledStart': DateTime.parse(startController.text)
            .toUtc()
            .toIso8601String(),
        'scheduledEnd': DateTime.parse(endController.text)
            .toUtc()
            .toIso8601String(),
        'status': status,
      };

      late http.Response response;

      if (editingId == null) {
        response = await http.post(
          Uri.parse('$apiUrl/api/Activities'),
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonEncode(body),
        );
      } else {
        final updateBody = {
          'name': nameController.text.trim(),
          'category': category,
          'description': descriptionController.text.trim(),
          'location': locationController.text.trim(),
          'estimatedCost': double.parse(costController.text),
          'durationMinutes': int.parse(durationController.text),
          'scheduledStart': DateTime.parse(startController.text)
              .toUtc()
              .toIso8601String(),
          'scheduledEnd': DateTime.parse(endController.text)
              .toUtc()
              .toIso8601String(),
          'status': status,
        };

        response = await http.put(
          Uri.parse(
            '$apiUrl/api/Activities/$editingId',
          ),
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonEncode(updateBody),
        );
      }

      if (response.statusCode < 200 ||
          response.statusCode >= 300) {
        throw Exception(
          'Failed to save activity. Status: ${response.statusCode}',
        );
      }

      resetForm();
      await loadActivities();
    } catch (e) {
      setState(() {
        error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          saving = false;
        });
      }
    }
  }

  void editActivity(dynamic activity) {
    setState(() {
      editingId = activity['id'];

      nameController.text = activity['name'] ?? '';
      category = activity['category'] ?? 'Hiking';
      descriptionController.text = activity['description'] ?? '';
      locationController.text = activity['location'] ?? '';
      costController.text = activity['estimatedCost']?.toString() ?? '';
      durationController.text =
          activity['durationMinutes']?.toString() ?? '';

      startController.text =
          DateTime.parse(activity['scheduledStart'])
              .toLocal()
              .toIso8601String()
              .substring(0, 16);

      endController.text =
          DateTime.parse(activity['scheduledEnd'])
              .toLocal()
              .toIso8601String()
              .substring(0, 16);

      status = activity['status'] ?? 'PLANNED';
    });
  }

  Future<void> deleteActivity(int id) async {
    final response = await http.delete(
      Uri.parse(
        '$apiUrl/api/Activities/$id',
      ),
    );

    if (response.statusCode >= 200 &&
        response.statusCode < 300) {
      await loadActivities();
    } else {
      setState(() {
        error =
            'Failed to delete activity. Status: ${response.statusCode}';
      });
    }
  }

  void resetForm() {
    setState(() {
      editingId = null;

      nameController.clear();
      descriptionController.clear();
      locationController.clear();
      costController.clear();
      durationController.clear();
      startController.clear();
      endController.clear();

      category = 'Hiking';
      status = 'PLANNED';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Experience & Activity Planning',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),

        const SizedBox(height: 20),

        if (error.isNotEmpty)
          Text(
            error,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
            ),
          ),

        TextField(
          controller: nameController,
          decoration: const InputDecoration(
            labelText: 'Activity Name',
            border: OutlineInputBorder(),
          ),
        ),

        const SizedBox(height: 12),

        DropdownButtonFormField<String>(
          initialValue: category,
          decoration: const InputDecoration(
            labelText: 'Category',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(
              value: 'Hiking',
              child: Text('Hiking'),
            ),
            DropdownMenuItem(
              value: 'Nature',
              child: Text('Nature'),
            ),
            DropdownMenuItem(
              value: 'Photography',
              child: Text('Photography'),
            ),
            DropdownMenuItem(
              value: 'Adventure',
              child: Text('Adventure'),
            ),
            DropdownMenuItem(
              value: 'Culture',
              child: Text('Culture'),
            ),
            DropdownMenuItem(
              value: 'Food',
              child: Text('Food'),
            ),
            DropdownMenuItem(
              value: 'Relaxation',
              child: Text('Relaxation'),
            ),
          ],
          onChanged: (value) {
            if (value != null) {
              setState(() {
                category = value;
              });
            }
          },
        ),

        const SizedBox(height: 12),

        TextField(
          controller: descriptionController,
          decoration: const InputDecoration(
            labelText: 'Description',
            border: OutlineInputBorder(),
          ),
        ),

        const SizedBox(height: 12),

        TextField(
          controller: locationController,
          decoration: const InputDecoration(
            labelText: 'Location',
            border: OutlineInputBorder(),
          ),
        ),

        const SizedBox(height: 12),

        TextField(
          controller: costController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Estimated Cost (LKR)',
            border: OutlineInputBorder(),
          ),
        ),

        const SizedBox(height: 12),

        TextField(
          controller: durationController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Duration (Minutes)',
            border: OutlineInputBorder(),
          ),
        ),

        const SizedBox(height: 12),

        TextField(
          controller: startController,
          decoration: const InputDecoration(
            labelText:
                'Start Time (2026-10-10T11:00)',
            border: OutlineInputBorder(),
          ),
        ),

        const SizedBox(height: 12),

        TextField(
          controller: endController,
          decoration: const InputDecoration(
            labelText:
                'End Time (2026-10-10T12:00)',
            border: OutlineInputBorder(),
          ),
        ),

        const SizedBox(height: 12),

        DropdownButtonFormField<String>(
          initialValue: status,
          decoration: const InputDecoration(
            labelText: 'Status',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(
              value: 'PLANNED',
              child: Text('Planned'),
            ),
            DropdownMenuItem(
              value: 'CONFIRMED',
              child: Text('Confirmed'),
            ),
            DropdownMenuItem(
              value: 'COMPLETED',
              child: Text('Completed'),
            ),
            DropdownMenuItem(
              value: 'CANCELLED',
              child: Text('Cancelled'),
            ),
          ],
          onChanged: (value) {
            if (value != null) {
              setState(() {
                status = value;
              });
            }
          },
        ),

        const SizedBox(height: 20),

        ElevatedButton(
          onPressed: saving
              ? null
              : saveActivity,
          child: Text(
            editingId == null
                ? 'Add Activity'
                : 'Update Activity',
          ),
        ),

        const SizedBox(height: 30),

        const Text(
          'Activity Schedule',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),

        const SizedBox(height: 15),

        if (loading)
          const CircularProgressIndicator()
        else
          ...activities.map(
            (activity) => Card(
              child: Padding(
                padding:
                    const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Text(
                      activity['name'] ?? '',
                      style: const TextStyle(
                        fontWeight:
                            FontWeight.bold,
                      ),
                    ),

                    Text(
                      'Category: ${activity['category']}',
                    ),

                    Text(
                      'Location: ${activity['location']}',
                    ),

                    Text(
                      'Cost: LKR ${activity['estimatedCost']}',
                    ),

                    Text(
                      'Status: ${activity['status']}',
                    ),

                    Row(
                      children: [
                        ElevatedButton(
                          onPressed: () {
                            editActivity(
                              activity,
                            );
                          },
                          child:
                              const Text('Edit'),
                        ),

                        const SizedBox(
                          width: 10,
                        ),

                        ElevatedButton(
                          onPressed: () {
                            deleteActivity(
                              activity['id'],
                            );
                          },
                          child:
                              const Text('Delete'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}