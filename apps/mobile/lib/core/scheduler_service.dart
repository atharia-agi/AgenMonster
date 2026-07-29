import 'dart:async';

class SchedulerService {
  SchedulerService._();
  static final SchedulerService instance = SchedulerService._();
  final List<Timer> _timers = [];

  Future<void> boot() async {
    // The Rust scheduler fires tasks on the bus on its own; here we
    // additionally schedule client-side reminders.
    _timers.add(Timer.periodic(const Duration(minutes: 60), (_) async {
      // tell the agent: "hourly check-in"
    }));
  }
}
