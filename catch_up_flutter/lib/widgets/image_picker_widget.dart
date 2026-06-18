import 'dart:io';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'package:image_picker/image_picker.dart';

/// Profile Photo Upload Widget

class ProfilePhotoPicker extends StatefulWidget {
  final Function(File? image)? onImageSelected;
  final String? currentPhotoUrl;
  final double size;

  const ProfilePhotoPicker({
    super.key,
    this.onImageSelected,
    this.currentPhotoUrl,
    this.size = 120,
  });

  @override
  State<ProfilePhotoPicker> createState() => _ProfilePhotoPickerState();
}

class _ProfilePhotoPickerState extends State<ProfilePhotoPicker>
    with SingleTickerProviderStateMixin {
  File? _selectedImage;
  final ImagePicker _picker = ImagePicker();
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: source,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );

      if (pickedFile != null) {
        setState(() {
          _selectedImage = File(pickedFile.path);
        });
        _animationController.forward(from: 0);
        widget.onImageSelected?.call(_selectedImage);
        Navigator.pop(context);
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
    }
  }

  void _showImageSourceDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.textPrimary,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Choose Photo',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 20),
                ListTile(
                  leading: const Icon(Icons.camera_alt, color: Color(0xFFFF6BB0)),
                  title: const Text('Take Photo', style: TextStyle(color: Colors.white)),
                  onTap: () => _pickImage(ImageSource.camera),
                ),
                ListTile(
                  leading: const Icon(Icons.photo_library, color: AppColors.primary),
                  title: const Text('Choose from Gallery', style: TextStyle(color: Colors.white)),
                  onTap: () => _pickImage(ImageSource.gallery),
                ),
                const SizedBox(height: 10),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel', style: TextStyle(color: Colors.white70)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _showImageSourceDialog,
      child: AnimatedBuilder(
        animation: _animationController,
        builder: (context, child) {
          final scale = 1 + (_animationController.value * 0.1);
          return Transform.scale(
            scale: scale,
            child: Container(
              width: widget.size,
              height: widget.size,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFF6BB0), AppColors.primary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white.withOpacity(0.3),
                  width: 3,
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFFF6BB0).withOpacity(0.4),
                    blurRadius: 20,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: ClipOval(
                child: _selectedImage != null
                    ? Image.file(
                        _selectedImage!,
                        fit: BoxFit.cover,
                        width: widget.size,
                        height: widget.size,
                      )
                    : widget.currentPhotoUrl != null
                        ? Image.network(
                            widget.currentPhotoUrl!,
                            fit: BoxFit.cover,
                            width: widget.size,
                            height: widget.size,
                            loadingBuilder: (context, child, progress) {
                              if (progress == null) return child;
                              return const Center(
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              );
                            },
                          )
                        : const Center(
                            child: Icon(
                              Icons.camera_alt,
                              color: Colors.white,
                              size: 40,
                            ),
                          ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class PhotoGrid extends StatelessWidget {
  final List<String>? photos;
  final Function(int index)? onRemove;
  final VoidCallback? onAdd;
  final int maxPhotos;

  const PhotoGrid({
    super.key,
    this.photos,
    this.onRemove,
    this.onAdd,
    this.maxPhotos = 6,
  });

  @override
  Widget build(BuildContext context) {
    final displayPhotos = photos ?? [];
    final canAddMore = displayPhotos.length < maxPhotos;

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: displayPhotos.length + (canAddMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index == displayPhotos.length && canAddMore) {
          // Add button
          return GestureDetector(
            onTap: onAdd,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Colors.white.withOpacity(0.2),
                  width: 2,
                ),
              ),
              child: const Icon(
                Icons.add,
                color: Colors.white,
                size: 40,
              ),
            ),
          );
        }

        // Photo item
        return Stack(
          children: [
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                image: DecorationImage(
                  image: NetworkImage(displayPhotos[index]),
                  fit: BoxFit.cover,
                ),
              ),
            ),
            if (onRemove != null)
              Positioned(
                top: 5,
                right: 5,
                child: GestureDetector(
                  onTap: () => onRemove!(index),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.black54,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
