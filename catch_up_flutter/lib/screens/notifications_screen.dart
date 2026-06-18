import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';

enum NotifType { match, like, message, system }

class _Notif {
  final String id, title, body, time, avatar;
  final NotifType type;
  bool read;
  _Notif({required this.id, required this.title, required this.body, required this.time, required this.avatar, required this.type, this.read = false});
}

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;
  final List<_Notif> _notifs = [
    _Notif(id:'1', title:'New Match! 🎉', body:'You and Sarah matched! Start a conversation.', time:'2m ago', avatar:'💕', type: NotifType.match),
    _Notif(id:'2', title:'Alex liked you ❤️', body:'Alex swiped right on your profile.', time:'15m ago', avatar:'❤️', type: NotifType.like),
    _Notif(id:'3', title:'Message from Sarah', body:'Hey there! How are you doing? 👋', time:'1h ago', avatar:'💬', type: NotifType.message),
    _Notif(id:'4', title:'New Match! 🎉', body:'You and Maya matched! Say hello.', time:'3h ago', avatar:'💕', type: NotifType.match, read: true),
    _Notif(id:'5', title:'Priya liked you ❤️', body:'Priya swiped right on your profile.', time:'5h ago', avatar:'❤️', type: NotifType.like, read: true),
    _Notif(id:'6', title:'Profile tip 💡', body:'Add more photos to get 3x more matches!', time:'1d ago', avatar:'💡', type: NotifType.system, read: true),
    _Notif(id:'7', title:'Weekly digest 📊', body:'You got 12 likes this week. Keep it up!', time:'2d ago', avatar:'📊', type: NotifType.system, read: true),
  ];

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() { _tab.dispose(); super.dispose(); }

  List<_Notif> get _all => _notifs;
  List<_Notif> get _social => _notifs.where((n) => n.type != NotifType.system).toList();
  List<_Notif> get _system => _notifs.where((n) => n.type == NotifType.system).toList();
  int get _unread => _notifs.where((n) => !n.read).length;

  void _markAllRead() => setState(() { for (final n in _notifs) n.read = true; });

  Color _typeColor(NotifType t) {
    switch (t) {
      case NotifType.match: return AppColors.accent;
      case NotifType.like: return const Color(0xFFFF6B6B);
      case NotifType.message: return AppColors.primaryDark;
      case NotifType.system: return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgTop,
      appBar: AppBar(
        backgroundColor: AppColors.bgTop,
        elevation: 0,
        title: Row(children: [
          Text('Notifications', style: GoogleFonts.fredoka(fontSize: 24, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
          if (_unread > 0) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(99)),
              child: Text('$_unread', style: GoogleFonts.inter(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w700)),
            ),
          ],
        ]),
        actions: [
          if (_unread > 0)
            TextButton(
              onPressed: _markAllRead,
              child: Text('Mark all read', style: GoogleFonts.inter(fontSize: 13, color: AppColors.primaryDark, fontWeight: FontWeight.w600)),
            ),
        ],
        bottom: TabBar(
          controller: _tab,
          labelColor: AppColors.primaryDark,
          unselectedLabelColor: AppColors.textHint,
          indicatorColor: AppColors.primaryDark,
          indicatorWeight: 2.5,
          labelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'All'), Tab(text: 'Social'), Tab(text: 'System')],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          _buildList(_all),
          _buildList(_social),
          _buildList(_system),
        ],
      ),
    );
  }

  Widget _buildList(List<_Notif> items) {
    if (items.isEmpty) {
      return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Text('🔔', style: TextStyle(fontSize: 52)),
        const SizedBox(height: 12),
        Text('No notifications yet', style: GoogleFonts.fredoka(fontSize: 20, color: AppColors.textSecondary)),
        const SizedBox(height: 8),
        Text('You\'re all caught up!', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textHint)),
      ]));
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: items.length,
      itemBuilder: (context, i) => _buildTile(items[i]),
    );
  }

  Widget _buildTile(_Notif n) {
    return Dismissible(
      key: Key(n.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: const Color(0xFFE53935),
        child: const Icon(Icons.delete_outline, color: Colors.white),
      ),
      onDismissed: (_) => setState(() => _notifs.removeWhere((x) => x.id == n.id)),
      child: GestureDetector(
        onTap: () => setState(() => n.read = true),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: n.read ? AppColors.surface : AppColors.surfaceCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: n.read ? AppColors.divider : AppColors.border),
            boxShadow: n.read ? [] : [BoxShadow(color: AppColors.primary.withOpacity(0.08), blurRadius: 8, offset: const Offset(0, 2))],
          ),
          child: Row(children: [
            Container(
              width: 46, height: 46,
              decoration: BoxDecoration(
                color: _typeColor(n.type).withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(child: Text(n.avatar, style: const TextStyle(fontSize: 22))),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(n.title, style: GoogleFonts.inter(fontSize: 14, fontWeight: n.read ? FontWeight.w500 : FontWeight.w700, color: AppColors.textPrimary))),
                Text(n.time, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textHint)),
              ]),
              const SizedBox(height: 2),
              Text(n.body, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary), maxLines: 2, overflow: TextOverflow.ellipsis),
            ])),
            if (!n.read) ...[
              const SizedBox(width: 8),
              Container(width: 8, height: 8, decoration: BoxDecoration(color: AppColors.accent, shape: BoxShape.circle)),
            ],
          ]),
        ),
      ),
    );
  }
}
