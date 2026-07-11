import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../design/tokens.dart';
import '../providers/auth_provider.dart';

/// Reusable "Report user" bottom sheet. Presents reason chips + optional
/// details, calls POST /matches/report (which also blocks + unmatches), and
/// returns true via the sheet result when a report was submitted.
///
/// Usage: `await showReportSheet(context, ref, userId: id, name: name);`
Future<bool> showReportSheet(
  BuildContext context,
  WidgetRef ref, {
  required String userId,
  String? name,
}) async {
  final result = await showModalBottomSheet<bool>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (_) => _ReportSheet(ref: ref, userId: userId, name: name),
  );
  return result ?? false;
}

const _reasons = <Map<String, String>>[
  {'value': 'spam', 'label': 'Spam or scam'},
  {'value': 'harassment', 'label': 'Harassment or abuse'},
  {'value': 'fake', 'label': 'Fake profile'},
  {'value': 'inappropriate', 'label': 'Inappropriate content'},
  {'value': 'other', 'label': 'Something else'},
];

class _ReportSheet extends StatefulWidget {
  final WidgetRef ref;
  final String userId;
  final String? name;
  const _ReportSheet({required this.ref, required this.userId, this.name});

  @override
  State<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends State<_ReportSheet> {
  String? _reason;
  final _detailsController = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _detailsController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_reason == null || _submitting) return;
    setState(() => _submitting = true);

    final token = widget.ref.read(authProvider).token;
    if (token == null) {
      if (mounted) Navigator.pop(context, false);
      return;
    }

    try {
      await widget.ref.read(apiServiceProvider).reportUser(
            targetUserId: widget.userId,
            reason: _reason!,
            details: _detailsController.text.trim(),
            token: token,
          );
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not report: $e'), backgroundColor: AppTokens.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final who = widget.name != null && widget.name!.isNotEmpty ? widget.name! : 'this user';
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: AppTokens.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Report $who', style: AppTokens.textStyles.h2.copyWith(fontSize: 22, color: AppTokens.textHi, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text('They will be blocked and unmatched. Reports are reviewed by our team.',
              style: AppTokens.textStyles.bodySm.copyWith(color: AppTokens.textMid)),
          const SizedBox(height: 20),
          Wrap(
            spacing: 8, runSpacing: 8,
            children: _reasons.map((r) {
              final selected = _reason == r['value'];
              return GestureDetector(
                onTap: () => setState(() => _reason = r['value']),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    gradient: selected ? const LinearGradient(colors: [AppTokens.accent, AppTokens.accentMuted]) : null,
                    color: selected ? null : AppTokens.bg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: selected ? Colors.transparent : AppTokens.border),
                  ),
                  child: Text(r['label']!, style: AppTokens.textStyles.body.copyWith(fontSize: 13, fontWeight: FontWeight.w600, color: selected ? Colors.white : AppTokens.textMid)),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _detailsController,
            maxLines: 3,
            maxLength: 300,
            style: AppTokens.textStyles.body.copyWith(color: AppTokens.textHi),
            decoration: InputDecoration(
              hintText: 'Add details (optional)',
              hintStyle: AppTokens.textStyles.body.copyWith(color: AppTokens.textMid),
              filled: true,
              fillColor: AppTokens.bg,
              counterStyle: AppTokens.textStyles.bodySm.copyWith(color: AppTokens.textMid),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppTokens.border)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppTokens.border)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTokens.accent)),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _reason == null || _submitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTokens.danger,
                foregroundColor: Colors.white,
                disabledBackgroundColor: AppTokens.border,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _submitting
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text('Submit report', style: AppTokens.textStyles.body.copyWith(fontWeight: FontWeight.w700)),
            ),
          ),
        ]),
      ),
    );
  }
}
