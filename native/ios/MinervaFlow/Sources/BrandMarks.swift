import SwiftUI

/// Minimal SVG path-data parser (M/L/H/V/C/Z, absolute and relative)
/// covering exactly the subset of the SVG spec the Google/Facebook mark
/// paths below use — lets those paths be transcribed verbatim from the
/// same SVGs used on the web login page (see
/// app/[locale]/portal/login/page.tsx's GoogleMark/FacebookMark) instead
/// of hand-converting every curve's control points by eye, which is
/// exactly the kind of transcription that quietly distorts a logo.
private func svgPath(_ data: String) -> Path {
    var path = Path()
    var current = CGPoint.zero
    var start = CGPoint.zero
    let scanner = Scanner(string: data)
    scanner.charactersToBeSkipped = CharacterSet(charactersIn: ", ")

    func readDoubles(_ count: Int) -> [Double] {
        var values: [Double] = []
        for _ in 0..<count {
            if let value = scanner.scanDouble() { values.append(value) }
        }
        return values
    }

    while !scanner.isAtEnd {
        guard let command = scanner.scanCharacter() else { break }
        switch command {
        case "M":
            let v = readDoubles(2)
            current = CGPoint(x: v[0], y: v[1]); start = current
            path.move(to: current)
        case "m":
            let v = readDoubles(2)
            current = CGPoint(x: current.x + v[0], y: current.y + v[1]); start = current
            path.move(to: current)
        case "L":
            let v = readDoubles(2)
            current = CGPoint(x: v[0], y: v[1])
            path.addLine(to: current)
        case "l":
            let v = readDoubles(2)
            current = CGPoint(x: current.x + v[0], y: current.y + v[1])
            path.addLine(to: current)
        case "H":
            let v = readDoubles(1)
            current = CGPoint(x: v[0], y: current.y)
            path.addLine(to: current)
        case "h":
            let v = readDoubles(1)
            current = CGPoint(x: current.x + v[0], y: current.y)
            path.addLine(to: current)
        case "V":
            let v = readDoubles(1)
            current = CGPoint(x: current.x, y: v[0])
            path.addLine(to: current)
        case "v":
            let v = readDoubles(1)
            current = CGPoint(x: current.x, y: current.y + v[0])
            path.addLine(to: current)
        case "C":
            let v = readDoubles(6)
            let c1 = CGPoint(x: v[0], y: v[1]), c2 = CGPoint(x: v[2], y: v[3])
            current = CGPoint(x: v[4], y: v[5])
            path.addCurve(to: current, control1: c1, control2: c2)
        case "c":
            let v = readDoubles(6)
            let c1 = CGPoint(x: current.x + v[0], y: current.y + v[1])
            let c2 = CGPoint(x: current.x + v[2], y: current.y + v[3])
            current = CGPoint(x: current.x + v[4], y: current.y + v[5])
            path.addCurve(to: current, control1: c1, control2: c2)
        case "Z", "z":
            path.closeSubpath()
            current = start
        default:
            break
        }
    }
    return path
}

/// Google's four-color "G" — transcribed from the same path data as the
/// web login page's GoogleMark (48×48 viewBox), scaled to fit whatever
/// frame is applied.
struct GoogleMarkIcon: View {
    var body: some View {
        GeometryReader { geo in
            let scale = min(geo.size.width, geo.size.height) / 48
            ZStack {
                svgPath("M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z")
                    .fill(Color(red: 1, green: 0.753, blue: 0.027))
                svgPath("M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 6.1 29.6 4 24 4 15.3 4 9.8 8.5 6.3 14.7z")
                    .fill(Color(red: 1, green: 0.239, blue: 0))
                svgPath("M24 44c5.5 0 10.4-1.9 14-5.4l-6.5-5.5c-2 1.5-4.6 2.4-7.5 2.4-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.7 39.4 16.3 44 24 44z")
                    .fill(Color(red: 0.298, green: 0.686, blue: 0.314))
                svgPath("M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C41.5 36 44 30.5 44 24c0-1.4-.1-2.7-.4-3.5z")
                    .fill(Color(red: 0.098, green: 0.463, blue: 0.824))
            }
            .frame(width: 48, height: 48)
            .scaleEffect(scale)
            .position(x: geo.size.width / 2, y: geo.size.height / 2)
        }
    }
}

/// Facebook's "f" mark — same single-path transcription as the web
/// login's FacebookMark (24×24 viewBox).
struct FacebookMarkIcon: View {
    var body: some View {
        GeometryReader { geo in
            let scale = min(geo.size.width, geo.size.height) / 24
            svgPath("M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z")
                .fill(Color(red: 0.094, green: 0.467, blue: 0.949))
                .frame(width: 24, height: 24)
                .scaleEffect(scale)
                .position(x: geo.size.width / 2, y: geo.size.height / 2)
        }
    }
}
