import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class ExpenseManager extends StatefulWidget {
  const ExpenseManager({
    super.key,
    required this.tripId,
    this.onExpenseChanged,
  });

  final int tripId;
  final VoidCallback? onExpenseChanged;

  @override
  State<ExpenseManager> createState() => _ExpenseManagerState();
}

class _ExpenseManagerState extends State<ExpenseManager> {
  final TextEditingController categoryController =
      TextEditingController(text: '1');

  final TextEditingController amountController =
      TextEditingController();

  final TextEditingController descriptionController =
      TextEditingController();

  final TextEditingController dateController =
      TextEditingController();

  final String apiUrl = 'http://localhost:5179';

  List<dynamic> expenses = [];

  String paymentMethod = 'CASH';

  int? editingId;

  bool loading = true;
  bool saving = false;

  String error = '';

  @override
  void initState() {
    super.initState();
    loadExpenses();
  }

  @override
  void dispose() {
    categoryController.dispose();
    amountController.dispose();
    descriptionController.dispose();
    dateController.dispose();

    super.dispose();
  }

  // ============================================================
  // READ EXPENSES
  // ============================================================

  Future<void> loadExpenses() async {
    try {
      setState(() {
        loading = true;
        error = '';
      });

      final response = await http.get(
        Uri.parse(
          '$apiUrl/api/Expenses/trip/${widget.tripId}',
        ),
      );

      if (response.statusCode != 200) {
        throw Exception(
          'Failed to load expenses. Status: ${response.statusCode}',
        );
      }

      final data = jsonDecode(response.body);

      setState(() {
        expenses = data;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  // ============================================================
  // CREATE OR UPDATE
  // ============================================================

  Future<void> saveExpense() async {
    final amount = double.tryParse(
      amountController.text.trim(),
    );

    final categoryId = int.tryParse(
      categoryController.text.trim(),
    );

    if (amount == null || amount <= 0) {
      setState(() {
        error = 'Please enter a valid amount greater than 0.';
      });

      return;
    }

    if (categoryId == null || categoryId <= 0) {
      setState(() {
        error = 'Please enter a valid Budget Category ID.';
      });

      return;
    }

    if (descriptionController.text.trim().isEmpty) {
      setState(() {
        error = 'Please enter a description.';
      });

      return;
    }

    if (dateController.text.trim().isEmpty) {
      setState(() {
        error = 'Please select an expense date.';
      });

      return;
    }

    try {
      setState(() {
        saving = true;
        error = '';
      });

      final expenseDate = DateTime.parse(
        dateController.text,
      ).toUtc().toIso8601String();

      late http.Response response;

      // CREATE
      if (editingId == null) {
        final body = {
          'tripId': widget.tripId,
          'budgetCategoryId': categoryId,
          'amount': amount,
          'description': descriptionController.text.trim(),
          'expenseDate': expenseDate,
          'paymentMethod': paymentMethod,
        };

        response = await http.post(
          Uri.parse(
            '$apiUrl/api/Expenses',
          ),
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonEncode(body),
        );
      }

      // UPDATE
      else {
        final body = {
          'amount': amount,
          'description': descriptionController.text.trim(),
          'expenseDate': expenseDate,
          'paymentMethod': paymentMethod,
        };

        response = await http.put(
          Uri.parse(
            '$apiUrl/api/Expenses/$editingId',
          ),
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonEncode(body),
        );
      }

      if (response.statusCode < 200 ||
          response.statusCode >= 300) {
        throw Exception(
          'Failed to save expense. '
          'Status: ${response.statusCode}. '
          '${response.body}',
        );
      }

      resetForm();

      await loadExpenses();

      widget.onExpenseChanged?.call();
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

  // ============================================================
  // EDIT
  // ============================================================

  void editExpense(dynamic expense) {
    setState(() {
      editingId = expense['id'];

      categoryController.text =
          expense['budgetCategoryId']?.toString() ?? '1';

      amountController.text =
          expense['amount']?.toString() ?? '';

      descriptionController.text =
          expense['description']?.toString() ?? '';

      paymentMethod =
          expense['paymentMethod']?.toString() ?? 'CASH';

      final expenseDate = expense['expenseDate'];

      if (expenseDate != null) {
        final date = DateTime.parse(
          expenseDate.toString(),
        ).toLocal();

        dateController.text =
            date.toIso8601String().substring(0, 16);
      }
    });
  }

  // ============================================================
  // DELETE
  // ============================================================

  Future<void> deleteExpense(int id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text(
            'Delete Expense',
          ),
          content: const Text(
            'Are you sure you want to delete this expense?',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(
                  context,
                  false,
                );
              },
              child: const Text(
                'Cancel',
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(
                  context,
                  true,
                );
              },
              child: const Text(
                'Delete',
              ),
            ),
          ],
        );
      },
    );

    if (confirmed != true) {
      return;
    }

    try {
      setState(() {
        error = '';
      });

      final response = await http.delete(
        Uri.parse(
          '$apiUrl/api/Expenses/$id',
        ),
      );

      if (response.statusCode < 200 ||
          response.statusCode >= 300) {
        throw Exception(
          'Failed to delete expense. '
          'Status: ${response.statusCode}',
        );
      }

      await loadExpenses();

      widget.onExpenseChanged?.call();
    } catch (e) {
      setState(() {
        error = e.toString();
      });
    }
  }

  // ============================================================
  // DATE AND TIME PICKER
  // ============================================================

  Future<void> selectDateTime() async {
    final selectedDate = await showDatePicker(
      context: context,
      initialDate: DateTime(2026, 10, 10),
      firstDate: DateTime(2026, 10, 10),
      lastDate: DateTime(2026, 10, 13),
    );

    if (selectedDate == null) {
      return;
    }

    if (!mounted) {
      return;
    }

    final selectedTime = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(
        hour: 12,
        minute: 0,
      ),
    );

    if (selectedTime == null) {
      return;
    }

    final dateTime = DateTime(
      selectedDate.year,
      selectedDate.month,
      selectedDate.day,
      selectedTime.hour,
      selectedTime.minute,
    );

    setState(() {
      dateController.text =
          dateTime.toIso8601String().substring(0, 16);
    });
  }

  // ============================================================
  // RESET FORM
  // ============================================================

  void resetForm() {
    setState(() {
      editingId = null;

      categoryController.text = '1';

      amountController.clear();
      descriptionController.clear();
      dateController.clear();

      paymentMethod = 'CASH';
    });
  }

  // ============================================================
  // FORMAT DATE
  // ============================================================

  String formatDate(dynamic value) {
    if (value == null) {
      return '-';
    }

    try {
      final date = DateTime.parse(
        value.toString(),
      ).toLocal();

      return '${date.month}/${date.day}/${date.year} '
          '${date.hour.toString().padLeft(2, '0')}:'
          '${date.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return value.toString();
    }
  }

  // ============================================================
  // UI
  // ============================================================

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Trip Expenses',
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

        TextField(
          controller: categoryController,
          enabled: editingId == null,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Budget Category ID',
            border: OutlineInputBorder(),
          ),
        ),

        const SizedBox(height: 15),

        TextField(
          controller: amountController,
          keyboardType: const TextInputType.numberWithOptions(
            decimal: true,
          ),
          decoration: const InputDecoration(
            labelText: 'Amount (LKR)',
            border: OutlineInputBorder(),
          ),
        ),

        const SizedBox(height: 15),

        TextField(
          controller: descriptionController,
          decoration: const InputDecoration(
            labelText: 'Description',
            border: OutlineInputBorder(),
          ),
        ),

        const SizedBox(height: 15),

        TextField(
          controller: dateController,
          readOnly: true,
          onTap: selectDateTime,
          decoration: const InputDecoration(
            labelText: 'Expense Date',
            border: OutlineInputBorder(),
            suffixIcon: Icon(
              Icons.calendar_month,
            ),
          ),
        ),

        const SizedBox(height: 15),

        DropdownButtonFormField<String>(
          initialValue: paymentMethod,
          decoration: const InputDecoration(
            labelText: 'Payment Method',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(
              value: 'CASH',
              child: Text('Cash'),
            ),
            DropdownMenuItem(
              value: 'CARD',
              child: Text('Card'),
            ),
            DropdownMenuItem(
              value: 'BANK_TRANSFER',
              child: Text('Bank Transfer'),
            ),
          ],
          onChanged: (value) {
            if (value != null) {
              setState(() {
                paymentMethod = value;
              });
            }
          },
        ),

        const SizedBox(height: 20),

        Row(
          children: [
            ElevatedButton(
              onPressed: saving
                  ? null
                  : saveExpense,
              child: Text(
                editingId == null
                    ? 'Add Expense'
                    : 'Update Expense',
              ),
            ),

            if (editingId != null) ...[
              const SizedBox(width: 10),
              TextButton(
                onPressed: resetForm,
                child: const Text(
                  'Cancel Edit',
                ),
              ),
            ],
          ],
        ),

        const SizedBox(height: 30),

        const Divider(),

        const SizedBox(height: 20),

        const Text(
          'Expense History',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),

        const SizedBox(height: 15),

        if (loading)
          const Center(
            child: CircularProgressIndicator(),
          )
        else if (expenses.isEmpty)
          const Text(
            'No expenses found for this trip.',
          )
        else
          ...expenses.map(
            (expense) {
              return Card(
                margin: const EdgeInsets.only(
                  bottom: 15,
                ),
                child: Padding(
                  padding: const EdgeInsets.all(
                    15,
                  ),
                  child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                      Text(
                        expense['description']
                                ?.toString() ??
                            'Expense',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight:
                              FontWeight.bold,
                        ),
                      ),

                      const SizedBox(height: 10),

                      Text(
                        'Amount: LKR ${expense['amount']}',
                      ),

                      Text(
                        'Category ID: '
                        '${expense['budgetCategoryId']}',
                      ),

                      Text(
                        'Payment: '
                        '${expense['paymentMethod']}',
                      ),

                      Text(
                        'Date: ${formatDate(expense['expenseDate'])}',
                      ),

                      const SizedBox(height: 12),

                      Row(
                        children: [
                          ElevatedButton(
                            onPressed: () {
                              editExpense(
                                expense,
                              );
                            },
                            child: const Text(
                              'Edit',
                            ),
                          ),

                          const SizedBox(width: 10),

                          ElevatedButton(
                            onPressed: () {
                              deleteExpense(
                                expense['id'],
                              );
                            },
                            child: const Text(
                              'Delete',
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),

        const SizedBox(height: 10),

        ElevatedButton(
          onPressed: loadExpenses,
          child: const Text(
            'Refresh Expenses',
          ),
        ),
      ],
    );
  }
}