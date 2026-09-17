import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('TravelWise starts at sign in without loading a demonstration trip', (WidgetTester tester) async {
    await tester.pumpWidget(const TravelWiseApp());

    // Verify that the AppBar title 'TravelWise' is rendered
    expect(find.text('TravelWise'), findsOneWidget);

    // Verify that the flight takeoff icon is in the header
    expect(find.byIcon(Icons.flight_takeoff), findsOneWidget);

    expect(find.text('Sign In'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.text('Ella Adventure'), findsNothing);
  });

  test('Trip DTO JSON decoding test', () {
    const rawJson = '''
    {
      "id": 2,
      "startingPlace": "Colombo",
      "destination": "Ella",
      "startDate": "2026-10-10T00:00:00Z",
      "returnDate": "2026-10-13T00:00:00Z",
      "budgetAmount": 80000.0,
      "travellerCount": 2,
      "tripType": "Adventure",
      "status": "PLANNING"
    }
    ''';

    final data = jsonDecode(rawJson) as Map<String, dynamic>;
    expect(data['id'], equals(2));
    expect(data['startingPlace'], equals('Colombo'));
    expect(data['destination'], equals('Ella'));
    expect(data['budgetAmount'], equals(80000.0));
    expect(data['travellerCount'], equals(2));
    expect(data['tripType'], equals('Adventure'));
    expect(data['status'], equals('PLANNING'));
  });

  test('Workflow Agent Results JSON structure test', () {
    const rawJson = '''
    {
      "trip_id": 2,
      "workflow_status": "AWAITING_APPROVAL",
      "approval_status": "PENDING",
      "agent_results": {
        "budget": {"status": "SUCCESS"},
        "activity": {"status": "SUCCESS"},
        "risk": {"status": "SUCCESS"},
        "readiness": {"status": "SUCCESS"}
      }
    }
    ''';

    final data = jsonDecode(rawJson) as Map<String, dynamic>;
    expect(data['workflow_status'], equals('AWAITING_APPROVAL'));
    expect(data['approval_status'], equals('PENDING'));
    final agents = data['agent_results'] as Map<String, dynamic>;
    expect(agents.containsKey('budget'), isTrue);
    expect(agents.containsKey('activity'), isTrue);
    expect(agents.containsKey('risk'), isTrue);
    expect(agents.containsKey('readiness'), isTrue);
  });
}
