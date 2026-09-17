import 'dart:convert';

import 'package:flutter/material.dart';
import 'api_client.dart' as http;

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
        scaffoldBackgroundColor: const Color(0xFF091B26),
        colorScheme: ColorScheme.fromSeed(
          brightness: Brightness.dark,
          seedColor: const Color(0xFF8AD9C5),
          primary: const Color(0xFF8AD9C5),
          secondary: const Color(0xFF0D9488),
          surface: const Color(0xFF112C38),
        ),
        cardTheme: CardThemeData(
          color: const Color(0xFF112C38),
          elevation: 8,
          margin: const EdgeInsets.only(bottom: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: Color(0xFF294651)),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFF0B2330),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFB9CDD2)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFB9CDD2)),
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

  bool loading = false;
  List<dynamic> trips = [];
  Map<String, dynamic>? snapshot;
  Map<String, dynamic>? adminStats;
  int requestVersion = 0;
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

  Future<void> loadAllData() async {
    if (currentUser == null) return;
    final version = ++requestVersion;
    setState(() { loading = true; error = ''; });
    try {
      if (currentUser?['role'] == 'Admin') {
        final response = await http.get(Uri.parse('${AppConfig.apiBaseUrl}/api/Admin/stats'));
        if (response.statusCode != 200) throw Exception();
        if (!mounted || version != requestVersion) return;
        setState(() { adminStats = jsonDecode(response.body) as Map<String, dynamic>; loading = false; });
        return;
      }
      final response = await http.get(Uri.parse('${AppConfig.apiBaseUrl}/api/Trips'));
      if (response.statusCode != 200) throw Exception('Your trips could not be loaded. Please try again.');
      final list = jsonDecode(response.body) as List<dynamic>;
      if (!mounted || version != requestVersion) return;
      final matches = list.where((item) => item['id'] == trip?['id']);
      final selected = matches.isNotEmpty ? matches.first : list.isNotEmpty ? list.first : null;
      Map<String, dynamic>? data;
      if (selected != null) {
        final summary = await http.get(Uri.parse('${AppConfig.apiBaseUrl}/api/Dashboard/trip/${selected['id']}'));
        if (summary.statusCode != 200) throw Exception('Your trip summary is unavailable.');
        data = jsonDecode(summary.body) as Map<String, dynamic>;
      }
      if (!mounted || version != requestVersion) return;
      setState(() {
        trips = list;
        trip = selected == null ? null : Map<String, dynamic>.from(selected);
        snapshot = data;
        budgetHealth = data?['budget'];
        activities = data?['activities'] ?? [];
        weather = data?['weather'];
        workflow = data?['workflow'];
        loading = false;
      });
    } catch (_) {
      if (!mounted || version != requestVersion) return;
      setState(() { error = 'Your saved trip information could not be loaded. Please try again.'; loading = false; });
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
      http.Session.token = data['token']?.toString();
      await loadAllData();
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
      requestVersion++;
      http.Session.token = null;
      trip = null; trips = []; snapshot = null; adminStats = null; budgetHealth = null; activities = []; weather = null; workflow = null;
      error = ''; loading = false;
      currentUser = null;
      _passwordController.clear();
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
      body: currentUser == null ? _buildProfileScreen() : loading
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
        selectedItemColor: const Color(0xFF8AD9C5),
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
    if (_selectedTabIndex != 4 && currentUser?['role'] == 'Admin') return _buildAdminOverview();
    if (_selectedTabIndex != 4 && trip == null) return _buildEmptyTrip();
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
          child: RiskDashboard(key: ValueKey(trip!['id']), tripId: trip!['id'] as int),
        );
      case 4:
        return _buildProfileScreen();
      default:
        return _buildHomeOverview();
    }
  }

  // TAB 0: HOME EXECUTIVE OVERVIEW
  Widget _buildHomeOverview() {
    final budget = snapshot?['budget'] as Map<String, dynamic>?;
    final readiness = snapshot?['readiness'] as Map<String, dynamic>?;
    final risk = snapshot?['risk'] as Map<String, dynamic>?;
    return ListView(padding: const EdgeInsets.all(20), children: [
      Card(child: Padding(padding: const EdgeInsets.all(24), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('YOUR SELECTED JOURNEY', style: TextStyle(letterSpacing: 2, color: Color(0xFF8AD9C5), fontSize: 11)),
        const SizedBox(height: 14),
        Text(trip!['destination'].toString(), style: const TextStyle(fontFamily: 'Georgia', fontSize: 34)),
        const SizedBox(height: 12),
        Text("${trip!['startingPlace']} → ${trip!['destination']}"),
        const SizedBox(height: 8),
        Text("${formatDate(trip!['startDate'])} — ${formatDate(trip!['returnDate'])}"),
        Text("${trip!['travellerCount']} travellers · ${trip!['status']}"),
        const SizedBox(height: 16),
        DropdownButtonFormField<int>(
          initialValue: trip!['id'] as int,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Selected trip'),
          items: trips.map((t) => DropdownMenuItem<int>(value: t['id'] as int, child: Text('${t['destination']} · ${formatDate(t['startDate'])}', overflow: TextOverflow.ellipsis))).toList(),
          onChanged: (id) { trip = Map<String, dynamic>.from(trips.firstWhere((t) => t['id'] == id)); loadAllData(); },
        ),
      ]))),
      _buildKpiCard('Budget health', budget?['health']?.toString() ?? 'Not available', budget == null ? 'Load your budget to continue' : "LKR ${budget['spent']} recorded of ${budget['allocated']}", const Color(0xFF8AD9C5), Icons.account_balance_wallet_outlined, () => setState(() { _selectedTabIndex = 2; _planSubTabIndex = 0; })),
      _buildKpiCard('Safe to spend', (budget?['allocated'] as num? ?? 0) > 0 ? "LKR ${budget!['safeToSpend']}" : 'Budget not set', 'After recorded expenses, food allowance and return reserve; other future costs may apply.', const Color(0xFF8AD9C5), Icons.savings_outlined, () => setState(() { _selectedTabIndex = 2; _planSubTabIndex = 0; })),
      _buildKpiCard('Readiness', (readiness?['total'] as num? ?? 0) > 0 ? "${readiness!['completed']} / ${readiness['total']}" : 'Checklist not set', 'Required preparation items', const Color(0xFF8AD9C5), Icons.checklist, () => setState(() { _selectedTabIndex = 2; _planSubTabIndex = 2; })),
      _buildKpiCard('Weather', weather?['isAvailable'] == true ? "${weather!['temperatureC']}°C" : 'Not available', weather?['retrievedAt'] == null ? 'Open Safety to check current conditions' : "Saved ${formatDate(weather!['retrievedAt'])}", const Color(0xFF8AD9C5), Icons.cloud_outlined, () => setState(() => _selectedTabIndex = 3)),
      _buildKpiCard('Safety risk', risk?['riskLevel']?.toString() ?? 'Not assessed', risk?['summary']?.toString() ?? 'Request an assessment in Safety', const Color(0xFF8AD9C5), Icons.shield_outlined, () => setState(() => _selectedTabIndex = 3)),
      _buildKpiCard('Planning workflow', workflow?['status']?.toString() ?? 'Not started', workflow?['approvalStatus']?.toString() ?? 'Start a plan when you are ready', const Color(0xFF8AD9C5), Icons.route, () => setState(() { _selectedTabIndex = 2; _planSubTabIndex = 3; })),
      FilledButton(onPressed: () => _createTrip(), child: const Text('Plan another trip')),
    ]);
  }

  Widget _buildAdminOverview() => ListView(padding: const EdgeInsets.all(20), children: [
    const Text('Admin workspace', style: TextStyle(fontSize: 30, fontFamily: 'Georgia')),
    const SizedBox(height: 20),
    for (final metric in <String, String>{'Pending traveller decisions': 'pendingTravellerDecisions', 'Pending admin verifications': 'pendingApprovals', 'Active trips': 'activeTrips', 'Users': 'totalUsers', 'Workflows': 'totalWorkflows'}.entries)
      Card(child: ListTile(title: Text(metric.key), trailing: Text(adminStats?[metric.value]?.toString() ?? 'Not available'))),
    Card(child: ListTile(title: const Text('System health'), subtitle: Text(adminStats?['databaseReachable'] == true ? 'Database reachable at the last successful overview read. Other service availability is not measured here.' : 'Not available'))),
    const SizedBox(height: 14),
    const Text('Audit history', style: TextStyle(fontSize: 22, fontFamily: 'Georgia')),
    for (final log in adminStats?['latestAudit'] as List<dynamic>? ?? [])
      Card(child: ListTile(title: Text(log['eventType'].toString()), subtitle: Text('${log['message']} · ${log['actor']}'))),
    if ((adminStats?['latestAudit'] as List<dynamic>? ?? []).isEmpty) const Text('No audit events recorded yet.'),
  ]);

  Widget _buildEmptyTrip() => Center(child: SingleChildScrollView(padding: const EdgeInsets.all(28), child: Column(children: [
    const Icon(Icons.explore_outlined, size: 72, color: Color(0xFF8AD9C5)),
    const SizedBox(height: 28),
    const Text('Where will you go next?', textAlign: TextAlign.center, style: TextStyle(fontSize: 34, fontFamily: 'Georgia')),
    const SizedBox(height: 18),
    const Text('Bring your route, budget, and experiences together.', textAlign: TextAlign.center),
    const SizedBox(height: 28),
    FilledButton(onPressed: () => _createTrip(), child: const Text('Plan Your First Trip')),
    OutlinedButton(onPressed: _exploreDestinations, child: const Text('Explore Destinations')),
  ])));

  Future<void> _exploreDestinations() async {
    final controller = TextEditingController();
    final query = await showDialog<String>(context: context, builder: (context) => AlertDialog(
      title: const Text('Explore destinations'), content: TextField(controller: controller, decoration: const InputDecoration(labelText: 'City or town')),
      actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Search'))],
    ));
    if (query == null || query.length < 2 || !mounted) return;
    try {
      final response = await http.get(Uri.parse('${AppConfig.apiBaseUrl}/api/Destinations/search').replace(queryParameters: {'query': query}));
      if (response.statusCode != 200) throw Exception();
      final results = jsonDecode(response.body)['destinations'] as List<dynamic>;
      if (!mounted) return;
      final place = await showDialog<String>(context: context, builder: (context) => AlertDialog(title: const Text('Choose a destination'), content: SizedBox(width: double.maxFinite, child: ListView(shrinkWrap: true, children: results.isEmpty ? [const Text('No places found. Try a city name.')] : results.map((p) => ListTile(title: Text(p['name']), subtitle: Text('${p['region']} · ${p['country']}'), onTap: () => Navigator.pop(context, '${p['name']}, ${p['country']}'))).toList())), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))]));
      if (place != null && mounted) await _createTrip(place);
    } catch (_) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Search is unavailable. Enter a destination directly when planning.'))); }
  }

  Future<void> _createTrip([String destination = '']) async {
    final formKey = GlobalKey<FormState>();
    final start = TextEditingController();
    final dest = TextEditingController(text: destination);
    final budget = TextEditingController();
    final people = TextEditingController(text: '1');
    DateTime? startDate;
    DateTime? returnDate;
    bool saving = false;
    String? failure;
    final created = await showDialog<bool>(context: context, barrierDismissible: false, builder: (dialogContext) => StatefulBuilder(builder: (context, update) => AlertDialog(
      title: const Text('Plan your trip'),
      content: SizedBox(width: 450, child: Form(key: formKey, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        TextFormField(controller: start, decoration: const InputDecoration(labelText: 'Starting place'), validator: (v) => v == null || v.trim().isEmpty ? 'Enter a starting place' : null),
        const SizedBox(height: 12),
        TextFormField(controller: dest, decoration: const InputDecoration(labelText: 'Destination'), validator: (v) => v == null || v.trim().isEmpty ? 'Enter a destination' : null),
        const SizedBox(height: 12),
        TextFormField(controller: budget, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Budget (LKR)'), validator: (v) => (double.tryParse(v ?? '') ?? -1) <= 0 ? 'Enter a positive budget' : null),
        const SizedBox(height: 12),
        TextFormField(controller: people, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Travellers'), validator: (v) => (int.tryParse(v ?? '') ?? 0) < 1 ? 'Enter at least one traveller' : null),
        TextButton(onPressed: saving ? null : () async { final selected = await showDateRangePicker(context: context, firstDate: DateTime(2020), lastDate: DateTime(2100)); if (selected != null && context.mounted) update(() { startDate = selected.start; returnDate = selected.end; }); }, child: Text(startDate == null ? 'Choose travel dates' : '${formatDate(startDate!.toIso8601String())} — ${formatDate(returnDate!.toIso8601String())}')),
        if (failure != null) Text(failure!, style: const TextStyle(color: Color(0xFFF2AAA5))),
      ])))),
      actions: [TextButton(onPressed: saving ? null : () => Navigator.pop(dialogContext, false), child: const Text('Cancel')), FilledButton(onPressed: saving ? null : () async {
        if (!formKey.currentState!.validate()) return;
        if (startDate == null) { update(() => failure = 'Choose travel dates'); return; }
        update(() { saving = true; failure = null; });
        try {
          final response = await http.post(Uri.parse('${AppConfig.apiBaseUrl}/api/Trips'), headers: {'Content-Type': 'application/json'}, body: jsonEncode({'startingPlace': start.text.trim(), 'destination': dest.text.trim(), 'startDate': startDate!.toUtc().toIso8601String(), 'returnDate': returnDate!.toUtc().toIso8601String(), 'budgetAmount': double.parse(budget.text), 'travellerCount': int.parse(people.text), 'status': 'PLANNING', 'travelScope': 'Local'}));
          if (response.statusCode < 200 || response.statusCode >= 300) throw Exception();
          if (!dialogContext.mounted || !mounted) return;
          trip = jsonDecode(response.body) as Map<String, dynamic>;
          Navigator.pop(dialogContext, true);
        } catch (_) { if (dialogContext.mounted) update(() { saving = false; failure = 'The trip could not be saved. Please try again.'; }); }
      }, child: Text(saving ? 'Saving…' : 'Create trip'))],
    )));
    // Controllers remain alive until the dialog transition has finished.
    if (created == true && mounted) { setState(() => _selectedTabIndex = 0); await loadAllData(); }
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
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFFE6F1EE)),
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
                    backgroundColor: const Color(0xFF173641),
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
          color: const Color(0xFF112C38),
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
        color: isSelected ? Colors.white : const Color(0xFFB9CDD2),
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
          tripId: trip!['id'] as int,
          onExpenseChanged: loadAllData,
        );
      case 1:
        return ActivityManager(key: ValueKey(trip!['id']), tripId: trip!['id'] as int);
      case 2:
        return ReadinessDashboard(key: ValueKey(trip!['id']), tripId: trip!['id'] as int);
      case 3:
        return WorkflowDashboard(
          tripId: trip!['id'] as int,
          user: currentUser,
        );
      default:
        return ExpenseManager(tripId: trip!['id'] as int);
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
                  tripRow('Active Trip', trip?['destination']?.toString() ?? 'No trip selected'),
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
                      const Icon(Icons.account_circle, size: 48, color: Color(0xFFE6F1EE)),
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
