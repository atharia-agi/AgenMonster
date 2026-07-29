// Live Activity for iOS Dynamic Island — WidgetKit.
// Shows pet stage, energy, and mood on lock screen.

import WidgetKit
import SwiftUI

struct AgenMonsterLiveActivity: Widget {
    var body: some Widget {
        DynamicIsland {
            DynamicIslandExpandedRegion(.leading) {
                Text("🥚")
                    .font(.title2)
            }
            DynamicIslandExpandedRegion(.trailing) {
                Text("EGG")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            DynamicIslandExpandedRegion(.bottom) {
                VStack(spacing: 4) {
                    HStack {
                        Text("ENERGY")
                            .font(.system(size: 8, design: .monospaced))
                            .foregroundColor(.gray)
                        Spacer()
                        Text("1000/1000")
                            .font(.system(size: 8, design: .monospaced))
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(Color.gray.opacity(0.3))
                            Rectangle()
                                .fill(Color.green)
                                .frame(width: geo.size.width)
                        }
                    }
                    .frame(height: 4)
                }
                .padding(.horizontal, 12)
            }
        }
    }
}

@main
struct AgenMonsterWidget: Widget {
    var body: some Widget {
        AgenMonsterLiveActivity()
    }
}
