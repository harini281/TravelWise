import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'activity_manager.dart';
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
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0F2B48),
          primary: const Color(0xFF0F2B48),
          secondary: const Color(0xFF0D9488),
          surface: Colors.white,
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 1,
          margin: const EdgeInsets.only(bottom: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFF0D9488), width: 1.5),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF0F2B48),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            textStyle: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0F2B48),
          foregroundColor: Colors.white,
          elevation: 0,
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
  int _selectedTabIndex = 0;
  int _planSubTabIndex = 0;

  Map<String, dynamic>? trip;
  Map<String, dynamic>? budgetHealth;
  List<dynamic> activities = [];
  Map<String, dynamic>? weather;
  Map<String, dynamic>? workflow;

  bool loading = true;
  String error = '';

  // Auth state & controllers
  Map<String, dynamic>? currentUser;
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool authLoading = false;
  String authError = '';

  @override
  void initState() {
    super.initState();
    loadAllData();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> loadAllData() async {
    try {
      setState(() {
        loading = true;
        error = '';
      });

      final results = await Future.wait([
        http.get(Uri.parse('${AppConfig.apiBaseUrl}/api/Trips/2')),
        http.get(Uri.parse('${AppConfig.apiBaseUrl}/api/Budgets/2/health')),
        http.get(Uri.parse('${AppConfig.apiBaseUrl}/api/Activities/trip/2')),
        http.get(Uri.parse('${AppConfig.apiBaseUrl}/api/Risk/weather/trip/2')),
        http.get(Uri.parse('${AppConfig.apiBaseUrl}/api/Workflow/trip/2')),
      ]);

      if (results[0].statusCode == 200) {
        trip = jsonDecode(results[0].body) as Map<String, dynamic>;
      }
      if (results[1].statusCode == 200) {
        budgetHealth = jsonDecode(results[1].body) as Map<String, dynamic>;
      }
      if (results[2].statusCode == 200) {
        final actData = jsonDecode(results[2].body);
        if (actData is List) activities = actData;
      }
      if (results[3].statusCode == 200) {
        weather = jsonDecode(results[3].body) as Map<String, dynamic>;
      }
      if (results[4].statusCode == 200) {
        final wfData = jsonDecode(results[4].body);
        if (wfData is List && wfData.isNotEmpty) {
          workflow = Map<String, dynamic>.from(wfData.last);
        } else if (wfData is Map) {
          workflow = Map<String, dynamic>.from(wfData);
        }
      }

      setState(() {
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString().replaceAll('Exception: ', '');
        loading = false;
      });
    }
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
        authError = '';
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
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh All',
            onPressed: loadAllData,
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
                        const Icon(Icons.cloud_off, size: 56, color: Colors.redAccent),
                        const SizedBox(height: 16),
                        Text(
                          'Backend Connection Error:\n$error',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 16),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: loadAllData,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry Connection'),
                        ),
                      ],
                    ),
                  ),
                )
              : _buildCurrentTab(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedTabIndex,
        onTap: (index) {
          setState(() {
            _selectedTabIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFF0F2B48),
        unselectedItemColor: Colors.grey.shade600,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
        unselectedLabelStyle: const TextStyle(fontSize: 11),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.map_outlined),
            activeIcon: Icon(Icons.map),
            label: 'Trip',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.calendar_month_outlined),
            activeIcon: Icon(Icons.calendar_month),
            label: 'Plan',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.shield_outlined),
            activeIcon: Icon(Icons.shield),
            label: 'Safety',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentTab() {
    switch (_selectedTabIndex) {
      case 0:
        return _buildHomeOverview();
      case 1:
        return _buildTripScreen();
      case 2:
        return _buildPlanScreen();
      case 3:
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: const RiskDashboard(tripId: 2),
        );
      case 4:
        return _buildProfileScreen();
      default:
        return _buildHomeOverview();
    }
  }

  // TAB 0: HOME EXECUTIVE OVERVIEW
  Widget _buildHomeOverview() {
    final remaining = budgetHealth?['remainingBudget'] ?? 75000;
    final healthStatus = budgetHealth?['budgetHealth'] ?? 'HEALTHY';
    final temp = weather?['temperatureCelsius']?.toString() ?? '21.6';

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hero Trip Card
          Card(
            color: const Color(0xFF0F2B48),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        trip?['status']?.toString() ?? 'PLANNING',
                        style: const TextStyle(
                          color: Color(0xFF2DD4BF),
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          letterSpacing: 1,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${trip?['travellerCount'] ?? 2} Travellers',
                          style: const TextStyle(color: Colors.white, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Ella Adventure',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        '${trip?['startingPlace'] ?? 'Colombo'} ➔ ${trip?['destination'] ?? 'Ella'}',
                        style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 15),
                      ),
                      const SizedBox(width: 8),
                      const Text('• 10 Oct – 13 Oct 2026', style: TextStyle(color: Colors.white70, fontSize: 13)),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 12),

          // 4 Compact KPI Cards
          Row(
            children: [
              Expanded(
                child: _buildKpiCard(
                  'Remaining',
                  'LKR $remaining',
                  healthStatus,
                  Colors.green.shade700,
                  Icons.account_balance_wallet,
                  () => setState(() {
                    _selectedTabIndex = 2;
                    _planSubTabIndex = 0;
                  }),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildKpiCard(
                  'Safety Risk',
                  '$temp°C',
                  'LOW RISK',
                  Colors.blue.shade700,
                  Icons.shield,
                  () => setState(() => _selectedTabIndex = 3),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildKpiCard(
                  'Readiness',
                  '75%',
                  'IN PROGRESS',
                  Colors.teal.shade700,
                  Icons.checklist,
                  () => setState(() {
                    _selectedTabIndex = 2;
                    _planSubTabIndex = 2;
                  }),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildKpiCard(
                  'Activities',
                  '${activities.length} Planned',
                  'ITINERARY',
                  Colors.indigo.shade700,
                  Icons.hiking,
                  () => setState(() {
                    _selectedTabIndex = 2;
                    _planSubTabIndex = 1;
                  }),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Next Activity Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.access_time, size: 18, color: Color(0xFF0D9488)),
                          SizedBox(width: 6),
                          Text('Next Activity', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        ],
                      ),
                      TextButton(
                        onPressed: () => setState(() {
                          _selectedTabIndex = 2;
                          _planSubTabIndex = 1;
                        }),
                        child: const Text('View All'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  if (activities.isNotEmpty) ...[
                    Text(
                      activities[0]['name']?.toString() ?? 'Excursion',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '📍 ${activities[0]['location'] ?? 'Ella'} • ${activities[0]['category'] ?? 'Sightseeing'} • ${activities[0]['durationMinutes'] ?? 180} mins',
                      style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                    ),
                  ] else
                    const Text('No activities scheduled yet. Schedule your first excursion.'),
                ],
              ),
            ),
          ),

          // AI Planning Status Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.bolt, color: Color(0xFF6366F1)),
                          SizedBox(width: 6),
                          Text('AI Trip Planning Status', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: workflow?['status'] == 'COMPLETED' ? Colors.green.shade100 : Colors.amber.shade100,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          workflow?['status']?.toString() ?? 'READY',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: workflow?['status'] == 'COMPLETED' ? Colors.green.shade900 : Colors.amber.shade900,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    workflow != null
                        ? 'Workflow #${workflow!['id']} evaluated by 4 specialized agents. Approval: ${workflow!['approvalStatus'] ?? 'PENDING'}.'
                        : 'TravelWise coordinates specialized agents to analyse your trip.',
                    style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0D9488),
                      minimumSize: const Size.fromHeight(40),
                    ),
                    onPressed: () => setState(() {
                      _selectedTabIndex = 2;
                      _planSubTabIndex = 3;
                    }),
                    child: const Text('Open AI Trip Planner'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard(String title, String value, String badge, Color badgeColor, IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(title, style: TextStyle(color: Colors.grey.shade600, fontSize: 12, fontWeight: FontWeight.w600)),
                  Icon(icon, size: 16, color: Colors.blueGrey),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                value,
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0F2B48)),
              ),
              const SizedBox(height: 4),
              Text(
                badge,
                style: TextStyle(color: badgeColor, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // TAB 1: TRIP DETAILS
  Widget _buildTripScreen() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Trip Details',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  Chip(
                    label: Text(
                      trip?['status']?.toString() ?? 'PLANNING',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    backgroundColor: Colors.blue.shade50,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              tripRow('Starting Place', trip?['startingPlace']?.toString() ?? '-'),
              tripRow('Destination', trip?['destination']?.toString() ?? '-'),
              tripRow('Start Date', formatDate(trip?['startDate'])),
              tripRow('Return Date', formatDate(trip?['returnDate'])),
              tripRow('Budget', 'LKR ${trip?['budgetAmount']}'),
              tripRow('Travellers', trip?['travellerCount']?.toString() ?? '-'),
              tripRow('Trip Type', trip?['tripType']?.toString() ?? '-'),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: loadAllData,
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh Trip Data'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // TAB 2: PLAN (SEGMENTED TABS)
  Widget _buildPlanScreen() {
    return Column(
      children: [
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildSegmentButton(0, '💳 Budget', Icons.account_balance_wallet),
                const SizedBox(width: 8),
                _buildSegmentButton(1, '🗓️ Activities', Icons.hiking),
                const SizedBox(width: 8),
                _buildSegmentButton(2, '📋 Readiness', Icons.checklist),
                const SizedBox(width: 8),
                _buildSegmentButton(3, '🤖 AI Planner', Icons.bolt),
              ],
            ),
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: _buildPlanSubContent(),
          ),
        ),
      ],
    );
  }

  Widget _buildSegmentButton(int index, String label, IconData icon) {
    final isSelected = _planSubTabIndex == index;
    return ChoiceChip(
      selected: isSelected,
      label: Text(label),
      selectedColor: const Color(0xFF0F2B48),
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : const Color(0xFF0F2B48),
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      onSelected: (_) {
        setState(() {
          _planSubTabIndex = index;
        });
      },
    );
  }

  Widget _buildPlanSubContent() {
    switch (_planSubTabIndex) {
      case 0:
        return ExpenseManager(
          tripId: 2,
          onExpenseChanged: loadAllData,
        );
      case 1:
        return const ActivityManager(tripId: 2);
      case 2:
        return const ReadinessDashboard(tripId: 2);
      case 3:
        return WorkflowDashboard(
          tripId: 2,
          user: currentUser,
        );
      default:
        return ExpenseManager(tripId: 2);
    }
  }

  // TAB 4: PROFILE & AUTHENTICATION
  Widget _buildProfileScreen() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildAuthCard(),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('System Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 10),
                  tripRow('Platform', 'TravelWise Client'),
                  tripRow('API Gateway', AppConfig.apiBaseUrl),
                  tripRow('Active Trip', 'Trip #2 (Ella Adventure)'),
                  tripRow('Authentication', currentUser != null ? 'JWT Bearer Authenticated' : 'Unauthenticated (Guest)'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAuthCard() {
    Color roleColor = Colors.blue;
    if (currentUser?['role'] == 'Admin') roleColor = Colors.red.shade700;
    if (currentUser?['role'] == 'Reviewer') roleColor = Colors.purple.shade700;

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: currentUser != null
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.account_circle, size: 48, color: Color(0xFF0F2B48)),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  currentUser!['username']?.toString() ?? '',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
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
                              style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton.icon(
                    onPressed: _handleLogout,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red.shade600,
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(42),
                    ),
                    icon: const Icon(Icons.logout, size: 16),
                    label: const Text('Sign Out'),
                  ),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'User Authentication',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Sign in to test role-based governance and approval actions.',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _usernameController,
                    decoration: const InputDecoration(
                      labelText: 'Username or Email',
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      prefixIcon: Icon(Icons.lock_outline),
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: authLoading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F2B48),
                      minimumSize: const Size.fromHeight(44),
                    ),
                    child: Text(authLoading ? 'Authenticating...' : 'Sign In'),
                  ),
                  if (authError.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      '⚠️ $authError',
                      style: TextStyle(color: Colors.red.shade700, fontSize: 13),
                    ),
                  ],
                  const SizedBox(height: 16),
                  const Divider(),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('💡 Examiner Quick-Fill:', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                      Wrap(
                        spacing: 4,
                        children: [
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
