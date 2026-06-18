import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class TransactionHistoryScreen extends StatefulWidget {
  const TransactionHistoryScreen({super.key});

  @override
  State<TransactionHistoryScreen> createState() => _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends State<TransactionHistoryScreen> {
  String _selectedFilter = 'All';
  final List<String> _filters = ['All', 'Pet Trades', 'Rewards', 'Withdrawals', 'Deposits'];

  // Mock transaction data
  final List<Transaction> _transactions = [
    Transaction(
      id: 'TXN001',
      type: 'pet_purchase',
      title: 'Purchased Crypto Fox',
      description: 'Bought NFT pet from marketplace',
      amount: -1210,
      currency: 'PCASH',
      timestamp: DateTime.now().subtract(const Duration(hours: 2)),
      status: 'completed',
      icon: '🦊',
      color: const Color(0xFFFF9500),
    ),
    Transaction(
      id: 'TXN002',
      type: 'reward',
      title: 'Daily Bonus Claimed',
      description: 'Day 7 streak reward',
      amount: 500,
      currency: 'PCASH',
      timestamp: DateTime.now().subtract(const Duration(days: 1)),
      status: 'completed',
      icon: '🎁',
      color: const Color(0xFF34C759),
    ),
    Transaction(
      id: 'TXN003',
      type: 'pet_sale',
      title: 'Sold Cyber Cat',
      description: 'Sold NFT pet to @crypto_king',
      amount: 2500,
      currency: 'PCASH',
      timestamp: DateTime.now().subtract(const Duration(days: 2)),
      status: 'completed',
      icon: '🐱',
      color: const Color(0xFF34C759),
    ),
    Transaction(
      id: 'TXN004',
      type: 'match_reward',
      title: 'Match Bonus',
      description: 'Reward for new match with Priya',
      amount: 100,
      currency: 'PCASH',
      timestamp: DateTime.now().subtract(const Duration(days: 3)),
      status: 'completed',
      icon: '💕',
      color: const Color(0xFF5856D6),
    ),
    Transaction(
      id: 'TXN005',
      type: 'withdrawal',
      title: 'Withdraw to Wallet',
      description: 'Withdrawal to 0x742d...bEbD',
      amount: -5000,
      currency: 'PCASH',
      timestamp: DateTime.now().subtract(const Duration(days: 5)),
      status: 'completed',
      icon: '💸',
      color: const Color(0xFFFF3B30),
    ),
    Transaction(
      id: 'TXN006',
      type: 'deposit',
      title: 'Deposit from Wallet',
      description: 'Deposit from MetaMask',
      amount: 10000,
      currency: 'PCASH',
      timestamp: DateTime.now().subtract(const Duration(days: 7)),
      status: 'completed',
      icon: '💰',
      color: const Color(0xFF34C759),
    ),
    Transaction(
      id: 'TXN007',
      type: 'pet_purchase',
      title: 'Purchased Diamond Dog',
      description: 'Bought rare NFT pet',
      amount: -5000,
      currency: 'PCASH',
      timestamp: DateTime.now().subtract(const Duration(days: 10)),
      status: 'completed',
      icon: '🐕',
      color: const Color(0xFFFF9500),
    ),
    Transaction(
      id: 'TXN008',
      type: 'leaderboard_reward',
      title: 'Weekly Leaderboard',
      description: 'Top 10 in Fantasy Bae League',
      amount: 2000,
      currency: 'PCASH',
      timestamp: DateTime.now().subtract(const Duration(days: 14)),
      status: 'completed',
      icon: '🏆',
      color: const Color(0xFFFFD700),
    ),
  ];

  List<Transaction> get _filteredTransactions {
    if (_selectedFilter == 'All') return _transactions;
    if (_selectedFilter == 'Pet Trades') {
      return _transactions.where((t) => t.type == 'pet_purchase' || t.type == 'pet_sale').toList();
    }
    if (_selectedFilter == 'Rewards') {
      return _transactions.where((t) => 
        t.type == 'reward' || t.type == 'match_reward' || t.type == 'leaderboard_reward'
      ).toList();
    }
    if (_selectedFilter == 'Withdrawals') {
      return _transactions.where((t) => t.type == 'withdrawal').toList();
    }
    if (_selectedFilter == 'Deposits') {
      return _transactions.where((t) => t.type == 'deposit').toList();
    }
    return _transactions;
  }

  double get _totalBalance {
    return _transactions.fold(0, (sum, t) => sum + t.amount);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgTop,
      body: CustomScrollView(
        slivers: [
          // App Bar with Balance
          SliverAppBar(
            expandedHeight: 200,
            floating: false,
            pinned: true,
            backgroundColor: AppColors.bgTop,
            elevation: 0,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppColors.primary.withOpacity(0.4),
                      AppColors.textPrimary,
                    ],
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Total Balance',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            color: Colors.white.withOpacity(0.7),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.token,
                              color: AppColors.accent,
                              size: 32,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '${_totalBalance.toStringAsFixed(0)}',
                              style: GoogleFonts.fredoka(
                                fontSize: 40,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'PCASH',
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            color: Colors.white.withOpacity(0.6),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              title: Text(
                'History',
                style: GoogleFonts.fredoka(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
          ),

          // Filter Chips
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _filters.map((filter) {
                    final isSelected = _selectedFilter == filter;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(filter),
                        selected: isSelected,
                        onSelected: (selected) {
                          setState(() => _selectedFilter = filter);
                        },
                        backgroundColor: Colors.white.withOpacity(0.1),
                        selectedColor: AppColors.primary,
                        labelStyle: GoogleFonts.inter(
                          fontSize: 13,
                          color: isSelected ? Colors.white : Colors.white70,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                          side: BorderSide(
                            color: isSelected 
                                ? AppColors.primary 
                                : Colors.white.withOpacity(0.2),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
          ),

          // Stats Cards
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      'This Month',
                      '+2,500',
                      Icons.trending_up,
                      const Color(0xFF34C759),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatCard(
                      'Pet Trades',
                      '12',
                      Icons.pets,
                      const Color(0xFFFF9500),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatCard(
                      'Rewards',
                      '8',
                      Icons.card_giftcard,
                      const Color(0xFF5856D6),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 24)),

          // Transactions List
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                'Transactions',
                style: GoogleFonts.fredoka(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 12)),

          // Transaction Items
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final transaction = _filteredTransactions[index];
                return _buildTransactionItem(transaction);
              },
              childCount: _filteredTransactions.length,
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withOpacity(0.1),
        ),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.fredoka(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 11,
              color: Colors.white.withOpacity(0.6),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionItem(Transaction transaction) {
    final isPositive = transaction.amount > 0;
    final dateFormat = DateFormat('MMM d, h:mm a');

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withOpacity(0.1),
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: transaction.color.withOpacity(0.2),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Text(
              transaction.icon,
              style: const TextStyle(fontSize: 24),
            ),
          ),
        ),
        title: Text(
          transaction.title,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              transaction.description,
              style: GoogleFonts.inter(
                fontSize: 12,
                color: Colors.white.withOpacity(0.6),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              dateFormat.format(transaction.timestamp),
              style: GoogleFonts.inter(
                fontSize: 11,
                color: Colors.white.withOpacity(0.4),
              ),
            ),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isPositive ? Icons.add : Icons.remove,
                  color: isPositive ? const Color(0xFF34C759) : const Color(0xFFFF3B30),
                  size: 16,
                ),
                Text(
                  '${transaction.amount.abs().toStringAsFixed(0)}',
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isPositive ? const Color(0xFF34C759) : const Color(0xFFFF3B30),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: transaction.status == 'completed'
                    ? const Color(0xFF34C759).withOpacity(0.2)
                    : const Color(0xFFFF9500).withOpacity(0.2),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                transaction.status.toUpperCase(),
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: transaction.status == 'completed'
                      ? const Color(0xFF34C759)
                      : const Color(0xFFFF9500),
                ),
              ),
            ),
          ],
        ),
        onTap: () => _showTransactionDetails(transaction),
      ),
    );
  }

  void _showTransactionDetails(Transaction transaction) {
    final dateFormat = DateFormat('MMMM d, y - h:mm a');
    
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Color(0xFF2D1B4E),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  // Icon
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: transaction.color.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Center(
                      child: Text(
                        transaction.icon,
                        style: const TextStyle(fontSize: 40),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Title
                  Text(
                    transaction.title,
                    style: GoogleFonts.fredoka(
                      fontSize: 22,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Amount
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        transaction.amount > 0 ? Icons.add : Icons.remove,
                        color: transaction.amount > 0 
                            ? const Color(0xFF34C759) 
                            : const Color(0xFFFF3B30),
                        size: 32,
                      ),
                      Text(
                        '${transaction.amount.abs().toStringAsFixed(0)} PCASH',
                        style: GoogleFonts.fredoka(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: transaction.amount > 0 
                              ? const Color(0xFF34C759) 
                              : const Color(0xFFFF3B30),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Details
                  _buildDetailRow('Transaction ID', transaction.id),
                  _buildDetailRow('Description', transaction.description),
                  _buildDetailRow('Date', dateFormat.format(transaction.timestamp)),
                  _buildDetailRow('Status', transaction.status.capitalize()),
                  _buildDetailRow('Currency', transaction.currency),
                  const SizedBox(height: 24),
                  // Close button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        'Close',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 14,
              color: Colors.white.withOpacity(0.6),
            ),
          ),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

// Transaction Model
class Transaction {
  final String id;
  final String type;
  final String title;
  final String description;
  final double amount;
  final String currency;
  final DateTime timestamp;
  final String status;
  final String icon;
  final Color color;

  Transaction({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.amount,
    required this.currency,
    required this.timestamp,
    required this.status,
    required this.icon,
    required this.color,
  });
}

// Extension for capitalize
extension StringExtension on String {
  String capitalize() {
    return "${this[0].toUpperCase()}${substring(1)}";
  }
}
