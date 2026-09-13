import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class RiskDashboard extends StatefulWidget {
  const RiskDashboard({
    super.key,
    required this.tripId,
  });

  final int tripId;

  @override
  State<RiskDashboard> createState() => _RiskDashboardState();
}

class _RiskDashboardState extends State<RiskDashboard> {
  final String apiUrl = 'http://localhost:5179';

  Map<String, dynamic>? weather;
  Map<String, dynamic>? risk;

  bool weatherLoading = false;
  bool riskLoading = false;

  String error = '';

  Future<void> checkWeather() async {
    try {
      setState(() {
        weatherLoading = true;
        error = '';
      });

      final response = await http.get(
        Uri.parse(
          '$apiUrl/api/Risk/weather/trip/${widget.tripId}',
        ),
      );

      if (response.statusCode != 200) {
        throw Exception(
          'Failed to load weather. Status: ${response.statusCode}',
        );
      }

      setState(() {
        weather = jsonDecode(response.body);
      });
    } catch (e) {
      setState(() {
        error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          weatherLoading = false;
        });
      }
    }
  }

  Future<void> assessRisk() async {
    try {
      setState(() {
        riskLoading = true;
        error = '';
      });

      final response = await http.post(
        Uri.parse(
          '$apiUrl/api/Risk/assess/trip/${widget.tripId}',
        ),
      );

      if (response.statusCode != 200) {
        throw Exception(
          'Risk assessment failed. Status: ${response.statusCode}',
        );
      }

      setState(() {
        risk = jsonDecode(response.body);
      });
    } catch (e) {
      setState(() {
        error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          riskLoading = false;
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
          'Travel Safety & Risk Management',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),

        const SizedBox(height: 20),

        if (error.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 15),
            child: Text(
              error,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),

        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            ElevatedButton(
              onPressed:
                  weatherLoading ? null : checkWeather,
              child: Text(
                weatherLoading
                    ? 'Checking...'
                    : 'Check Weather',
              ),
            ),
            ElevatedButton(
              onPressed:
                  riskLoading ? null : assessRisk,
              child: Text(
                riskLoading
                    ? 'Assessing...'
                    : 'Assess Trip Risk',
              ),
            ),
          ],
        ),

        const SizedBox(height: 25),

        const Text(
          'Weather Information',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),

        const SizedBox(height: 10),

        if (weather == null)
          const Text(
            'No weather information loaded yet.',
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
                    'Location: ${weather!['location'] ?? weather!['locationName'] ?? '-'}',
                  ),
                  Text(
                    'Temperature: ${weather!['temperatureC'] ?? weather!['temperatureCelsius'] ?? '-'} °C',
                  ),
                  Text(
                    'Wind Speed: ${weather!['windSpeedKph'] ?? '-'} km/h',
                  ),
                  Text(
                    'Weather Code: ${weather!['weatherCode'] ?? '-'}',
                  ),
                  Text(
                    'Source: ${weather!['source'] ?? '-'}',
                  ),
                ],
              ),
            ),
          ),

        const SizedBox(height: 25),

        const Text(
          'Trip Risk Assessment',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),

        const SizedBox(height: 10),

        if (risk == null)
          const Text(
            'No risk assessment completed yet.',
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
                    'Risk Score: ${risk!['riskScore'] ?? '-'}',
                  ),
                  Text(
                    'Risk Level: ${risk!['riskLevel'] ?? '-'}',
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Summary: ${risk!['summary'] ?? '-'}',
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}