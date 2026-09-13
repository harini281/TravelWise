import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'activity_manager.dart';
import 'budget_dashboard.dart';
import 'config.dart';
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

  // Auth state & controllers
  Map<String, dynamic>? currentUser;
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool authLoading = false;
  String authError = '';

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();
    if (username.isEmpty || password.isEmpty) {
      setState(() {
        authError = 'Please enter both username and password.';
      });
      return;
    }

    try {
      setState(() {
        authLoading = true;
        authError = '';
      });

      final response = await http.post(
        Uri.parse('${AppConfig.apiBaseUrl}/api/Auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'password': password,
        }),
      );

      if (response.statusCode == 401) {
        throw Exception('Invalid username or password.');
      }

      if (response.statusCode != 200) {
        throw Exception('Login failed: ${response.body}');
      }

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      setState(() {
        currentUser = {
          'username': data['username'],
          'email': data['email'],
          'role': data['role'],
          'token': data['token'],
        };
        _passwordController.clear();
      });
    } catch (e) {
      setState(() {
        authError = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          authLoading = false;
        });
      }
    }
  }

  void _handleLogout() {
    setState(() {
      currentUser = null;
      _passwordController.clear();
      authError = '';
    });
  }

  void _quickFillPersona(String u, String p) {
    _usernameController.text = u;
    _passwordController.text = p;
    setState(() {
      authError = '';
    });
  }

  Future<void> loadTrip() async {
    try {
      setState(() {
        loading = true;
        error = '';
      });

      final response = await http.get(
        Uri.parse('${AppConfig.apiBaseUrl}/api/Trips/2'),
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
                          // 0. User Authentication Card
                          _buildAuthCard(),

                          const SizedBox(height: 12),

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
                          WorkflowDashboard(
                            tripId: 2,
                            user: currentUser,
                          ),

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

  Widget _buildAuthCard() {
    Color roleColor = Colors.blue;
    if (currentUser?['role'] == 'Admin') roleColor = Colors.red.shade700;
    if (currentUser?['role'] == 'Reviewer') roleColor = Colors.purple.shade700;

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      color: Colors.grey.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: currentUser != null
            ? Row(
                children: [
                  const Icon(Icons.account_circle, size: 36, color: Colors.blueGrey),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              currentUser!['username']?.toString() ?? '',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: roleColor,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                currentUser!['role']?.toString() ?? '',
                                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        Text(
                          currentUser!['email']?.toString() ?? '',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: _handleLogout,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red.shade600,
                      foregroundColor: Colors.white,
                    ),
                    icon: const Icon(Icons.logout, size: 16),
                    label: const Text('Logout'),
                  ),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.lock_outline, size: 20),
                          SizedBox(width: 6),
                          Text(
                            'User Authentication',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ],
                      ),
                      Wrap(
                        spacing: 4,
                        children: [
                          Text('Quick Fill: ', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                          ActionChip(
                            label: const Text('Traveller', style: TextStyle(fontSize: 11)),
                            padding: EdgeInsets.zero,
                            onPressed: () => _quickFillPersona('traveller', 'Traveller123!'),
                          ),
                          ActionChip(
                            label: const Text('Reviewer', style: TextStyle(fontSize: 11)),
                            padding: EdgeInsets.zero,
                            onPressed: () => _quickFillPersona('reviewer', 'Reviewer123!'),
                          ),
                          ActionChip(
                            label: const Text('Admin', style: TextStyle(fontSize: 11)),
                            padding: EdgeInsets.zero,
                            onPressed: () => _quickFillPersona('admin', 'Admin123!'),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _usernameController,
                          decoration: const InputDecoration(
                            labelText: 'Username',
                            isDense: true,
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: _passwordController,
                          obscureText: true,
                          decoration: const InputDecoration(
                            labelText: 'Password',
                            isDense: true,
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      ElevatedButton(
                        onPressed: authLoading ? null : _handleLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue.shade700,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                        ),
                        child: Text(authLoading ? '...' : 'Login'),
                      ),
                    ],
                  ),
                  if (authError.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      '⚠️ $authError',
                      style: TextStyle(color: Colors.red.shade700, fontSize: 13),
                    ),
                  ],
                ],
              ),
      ),
    );
  }
}
