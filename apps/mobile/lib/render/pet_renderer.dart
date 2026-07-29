import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class PetRenderer extends StatelessWidget {
  final String stage;
  const PetRenderer({super.key, required this.stage});

  @override
  Widget build(BuildContext context) {
    // Real impl renders an animated SVG sprite or a 3D voxel view.
    return AspectRatio(
      aspectRatio: 1,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 500),
        child: SvgPicture.asset(
          'assets/sprites/stage_$stage.svg',
          key: ValueKey(stage),
        ),
      ),
    );
  }
}
