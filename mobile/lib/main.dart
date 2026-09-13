import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

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
      ),
      home: const TripDashboard(),
    );
  }
}

class TripDashboard extends StatefulWidget {
  const TripDashboard({super.key});

  @override
  State<TripDashboard> createState() => _TripDashboardState();
}

class _TripDashboardState extends State<TripDashboard> {
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
        Uri.parse(
          'http://10.0.2.2:5179/api/Trips/2',
        ),
      );

      if (response.statusCode != 200) {
        throw Exception(
          'Failed to load trip. Status: ${response.statusCode}',
        );
      }

      final data = jsonDecode(response.body);

      setState(() {
        trip = data;
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
        title: const Text('TravelWise'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: loading
            ? const Center(
                child: CircularProgressIndicator(),
              )
            : error.isNotEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment:
                          MainAxisAlignment.center,
                      children: [
                        Text(
                          error,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: loadTrip,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                : trip == null
                    ? const Center(
                        child: Text(
                          'Trip not found.',
                        ),
                      )
                    : ListView(
                        children: [
                          const Text(
                            'Trip Dashboard',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 20),

                          tripRow(
                            'Starting Place',
                            trip!['startingPlace']
                                    ?.toString() ??
                                '-',
                          ),

                          tripRow(
                            'Destination',
                            trip!['destination']
                                    ?.toString() ??
                                '-',
                          ),

                          tripRow(
                            'Start Date',
                            formatDate(
                              trip!['startDate'],
                            ),
                          ),

                          tripRow(
                            'Return Date',
                            formatDate(
                              trip!['returnDate'],
                            ),
                          ),

                          tripRow(
                            'Budget',
                            'LKR ${trip!['budgetAmount']}',
                          ),

                          tripRow(
                            'Travellers',
                            trip!['travellerCount']
                                    ?.toString() ??
                                '-',
                          ),

                          tripRow(
                            'Trip Type',
                            trip!['tripType']
                                    ?.toString() ??
                                '-',
                          ),

                          tripRow(
                            'Status',
                            trip!['status']
                                    ?.toString() ??
                                '-',
                          ),

                          const SizedBox(height: 20),

                          ElevatedButton(
                            onPressed: loadTrip,
                            child: const Text(
                              'Refresh Trip',
                            ),
                          ),
                        ],
                      ),
      ),
    );
  }

  Widget tripRow(
    String label,
    String value,
  ) {
    return Padding(
      padding: const EdgeInsets.only(
        bottom: 14,
      ),
      child: Row(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }

  String formatDate(dynamic value) {
    if (value == null) {
      return '-';
    }

    try {
      final date =
          DateTime.parse(value.toString());

      return '${date.month}/${date.day}/${date.year}';
    } catch (_) {
      return value.toString();
    }
  }
}