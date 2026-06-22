import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../design/tokens.dart';
import '../providers/auth_provider.dart';

/// Email/password auth screen with a login <-> register toggle.
class AuthScreen extends ConsumerStatefulWidget {
  final bool startInRegister;
  const AuthScreen({super.key, this.startInRegister = false});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _displayNameController = TextEditingController();
  late bool _isRegister;

  @override
  void initState() {
    super.initState();
    _isRegister = widget.startInRegister;
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _displayNameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final notifier = ref.read(authProvider.notifier);
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    final success = _isRegister
        ? await notifier.register(
            email: email,
            password: password,
            displayName: _displayNameController.text.trim(),
          )
        : await notifier.login(email: email, password: password);

    if (!success && mounted) {
      final error = ref.read(authProvider).error ?? 'Authentication failed';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error), backgroundColor: AppTokens.danger),
      );
    } else if (success && mounted) {
      // Navigate to home - AuthWrapper will handle routing to profile setup if needed
      Navigator.of(context).pushReplacementNamed('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(authLoadingProvider);

    return Scaffold(
      backgroundColor: AppTokens.bg,
      appBar: AppBar(
        backgroundColor: AppTokens.bg,
        elevation: 0,
        title: Text('Catch Up', style: AppTokens.textStyles.h3),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppTokens.s24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    _isRegister ? 'Create your account' : 'Welcome back',
                    style: AppTokens.textStyles.display2,
                  ),
                  const SizedBox(height: AppTokens.s8),
                  Text(
                    _isRegister
                        ? 'Sign up to start trading and matching.'
                        : 'Log in to your account.',
                    style: AppTokens.textStyles.body
                        .copyWith(color: AppTokens.textMid),
                  ),
                  const SizedBox(height: AppTokens.s32),
                  if (_isRegister) ...[
                    TextFormField(
                      controller: _displayNameController,
                      style: AppTokens.textStyles.body,
                      decoration: const InputDecoration(labelText: 'Display name'),
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: AppTokens.s16),
                  ],
                  TextFormField(
                    controller: _emailController,
                    style: AppTokens.textStyles.body,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Email'),
                    textInputAction: TextInputAction.next,
                    validator: (v) {
                      final value = (v ?? '').trim();
                      if (value.isEmpty) return 'Email is required';
                      if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value)) {
                        return 'Enter a valid email';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppTokens.s16),
                  TextFormField(
                    controller: _passwordController,
                    style: AppTokens.textStyles.body,
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'Password'),
                    textInputAction: TextInputAction.done,
                    onFieldSubmitted: (_) => _submit(),
                    validator: (v) {
                      if ((v ?? '').isEmpty) return 'Password is required';
                      if (_isRegister && v!.length < 8) {
                        return 'Password must be at least 8 characters';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppTokens.s24),
                  ElevatedButton(
                    onPressed: isLoading ? null : _submit,
                    child: isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(_isRegister ? 'Create account' : 'Log in'),
                  ),
                  const SizedBox(height: AppTokens.s16),
                  TextButton(
                    onPressed: isLoading
                        ? null
                        : () => setState(() => _isRegister = !_isRegister),
                    child: Text(
                      _isRegister
                          ? 'Already have an account? Log in'
                          : "Don't have an account? Sign up",
                      style: AppTokens.textStyles.body
                          .copyWith(color: AppTokens.accent),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
