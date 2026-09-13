import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'activity_manager.dart';
import 'budget_dashboard.dart';
import 'expense_manager.dart';
import 'readiness_dashboard.dart';
import 'risk_dashboard.dart';
import 'workflow_dashboard.dart';

void main() {
  runApp(const TravelWiseApp());
}

class TravelWiseApp extends StatelessWidget {
  const TravelWiseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'TravelWise',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blue,
        ),
      ),
      home: const TravelWiseHomeScreen(),
    );
  }
}

class TravelWiseHomeScreen extends StatefulWidget {
  const TravelWiseHomeScreen({super.key});

  @override
  State<TravelWiseHomeScreen> createState() => _TravelWiseHomeScreenState();
}

class _TravelWiseHomeScreenState extends State<TravelWiseHomeScreen> {
  final GlobalKey<BudgetDashboardState> _budgetKey = GlobalKey<BudgetDashboardState>();

  Map<String, dynamic>? trip;
  bool loading = true;
  String error = '';

  Future<void> loadTrip() async {
    try {
      setState(() {
        loading = true;
        error = '';
      });

      final response = await http.get(
        Uri.parse('http://localhost:5179/api/Trips/2'),
      );

      if (response.statusCode != 200) {
        throw Exception(
          'Failed to load trip. Status: ${response.statusCode}',
        );
      }

      final data = jsonDecode(response.body);

      setState(() {
        trip = data is Map<String, dynamic> ? data : Map<String, dynamic>.from(data);
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  @override
  void initState() {
    super.initState();
    loadTrip();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.flight_takeoff),
            SizedBox(width: 10),
            Text(
              'TravelWise',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh All',
            onPressed: () {
              loadTrip();
              _budgetKey.currentState?.loadBudget();
            },
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error.isNotEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.cloud_off,
                          size: 56,
                          color: Colors.redAccent,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Backend Connection Error:\n$error',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 16),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: loadTrip,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry Connection'),
                        ),
                      ],
                    ),
                  ),
                )
              : trip == null
                  ? const Center(child: Text('Trip not found.'))
                  : SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 16,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // 1. Trip Overview Card
                          Card(
                            elevation: 2,
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text(
                                        'Trip Dashboard',
                                        style: TextStyle(
                                          fontSize: 24,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Chip(
                                        label: Text(
                                          trip!['status']?.toString() ??
                                              'PLANNING',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        backgroundColor:
                                            Colors.blue.shade50,
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 16),
                                  tripRow(
                                    'Starting Place',
                                    trip!['startingPlace']?.toString() ?? '-',
                                  ),
                                  tripRow(
                                    'Destination',
                                    trip!['destination']?.toString() ?? '-',
                                  ),
                                  tripRow(
                                    'Start Date',
                                    formatDate(trip!['startDate']),
                                  ),
                                  tripRow(
                                    'Return Date',
                                    formatDate(trip!['returnDate']),
                                  ),
                                  tripRow(
                                    'Budget',
                                    'LKR ${trip!['budgetAmount']}',
                                  ),
                                  tripRow(
                                    'Travellers',
                                    trip!['travellerCount']?.toString() ?? '-',
                                  ),
                                  tripRow(
                                    'Trip Type',
                                    trip!['tripType']?.toString() ?? '-',
                                  ),
                                  const SizedBox(height: 12),
                                  ElevatedButton.icon(
                                    onPressed: loadTrip,
                                    icon: const Icon(Icons.refresh),
                                    label: const Text('Refresh Trip'),
                                  ),
                                ],
                              ),
                            ),
                          ),

                          const SizedBox(height: 24),
                          const Divider(thickness: 2),
                          const SizedBox(height: 16),

                          // 2. Budget Management
                          BudgetDashboard(
                            key: _budgetKey,
                            budgetId: 2,
                          ),

                          const SizedBox(height: 24),
                          const Divider(thickness: 2),
                          const SizedBox(height: 16),

                          // 3. Expense CRUD
                          ExpenseManager(
                            tripId: 2,
                            onExpenseChanged: () {
                              _budgetKey.currentState?.loadBudget();
                            },
                          ),

                          const SizedBox(height: 24),
                          const Divider(thickness: 2),
                          const SizedBox(height: 16),

                          // 4. Activity Planning
                          const ActivityManager(tripId: 2),

                          const SizedBox(height: 24),
                          const Divider(thickness: 2),
                          const SizedBox(height: 16),

                          // 5. Risk + Weather
                          const RiskDashboard(tripId: 2),

                          const SizedBox(height: 24),
                          const Divider(thickness: 2),
                          const SizedBox(height: 16),

                          // 6. Document Readiness
                          const ReadinessDashboard(tripId: 2),

                          const SizedBox(height: 24),
                          const Divider(thickness: 2),
                          const SizedBox(height: 16),

                          // 7. AI Workflow + Human Approval
                          const WorkflowDashboard(tripId: 2),

                          const SizedBox(height: 40),
                        ],
                      ),
                    ),
    );
  }

  Widget tripRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
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

  String formatDate(dynamic value) {
    if (value == null) return '-';
    try {
      final date = DateTime.parse(value.toString());
      return '${date.month}/${date.day}/${date.year}';
    } catch (_) {
      return value.toString();
    }
  }
}
