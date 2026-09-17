import 'dart:convert';

import 'package:flutter/material.dart';
import 'api_client.dart' as http;

import 'config.dart';

class BudgetDashboard extends StatefulWidget {
  const BudgetDashboard({
    super.key,
    required this.budgetId,
  });

  final int budgetId;

  @override
  State<BudgetDashboard> createState() =>
      BudgetDashboardState();
}

class BudgetDashboardState
    extends State<BudgetDashboard> {
  Map<String, dynamic>? budget;

  bool loading = true;
  String error = '';

  Future<void> loadBudget() async {
    try {
      setState(() {
        loading = true;
        error = '';
      });

      final response = await http.get(
        Uri.parse(
          '${AppConfig.apiBaseUrl}/api/Budgets/${widget.budgetId}/health',
        ),
      );

      if (response.statusCode != 200) {
        throw Exception(
          'Failed to load budget. Status: ${response.statusCode}',
        );
      }

      final data = jsonDecode(response.body);

      setState(() {
        budget = data;
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

    loadBudget();
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (error.isNotEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Error: $error',
          ),
          const SizedBox(height: 10),
          ElevatedButton(
            onPressed: loadBudget,
            child: const Text(
              'Retry Budget',
            ),
          ),
        ],
      );
    }

    if (budget == null) {
      return const Text(
        'Budget information not found.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Budget & Expense Management',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),

        const SizedBox(height: 20),

        budgetRow(
          'Total Budget',
          'LKR ${budget!['totalBudget']}',
        ),

        budgetRow(
          'Total Spent',
          'LKR ${budget!['totalSpent']}',
        ),

        budgetRow(
          'Remaining Budget',
          'LKR ${budget!['remainingBudget']}',
        ),

        budgetRow(
          'Spending',
          '${budget!['spendingPercentage']}%',
        ),

        budgetRow(
          'Budget Health',
          budget!['budgetHealth']?.toString() ?? '-',
        ),

        const SizedBox(height: 10),

        Text(
          getRecommendation(
            budget!['budgetHealth']?.toString(),
          ),
        ),

        const SizedBox(height: 15),

        ElevatedButton(
          onPressed: loadBudget,
          child: const Text(
            'Refresh Budget',
          ),
        ),
      ],
    );
  }

  Widget budgetRow(
    String label,
    String value,
  ) {
    return Padding(
      padding: const EdgeInsets.only(
        bottom: 12,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 160,
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

  String getRecommendation(
    String? health,
  ) {
    switch (health) {
      case 'HEALTHY':
        return 'Recommendation: Spending is currently under control.';

      case 'WARNING':
        return 'Recommendation: Monitor spending carefully.';

      case 'CRITICAL':
        return 'Recommendation: Reduce spending immediately.';

      default:
        return 'Recommendation: Budget status is unavailable.';
    }
  }
}