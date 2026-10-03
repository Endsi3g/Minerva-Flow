import CoreNFC
import Foundation

/// A tag's content is attacker-controlled (anyone can write any URL on a
/// sticker and stick it over a restaurant's), so nothing read from NFC is
/// routed until it proves to be a first-party /t/{code} or /p/{code} link.
enum NFCTagURL {
    static let allowedHosts: Set<String> = ["minervaflow.app", "www.minervaflow.app"]
    private static let codePattern = "^[A-Za-z0-9_-]{4,64}$"

    static func validated(_ url: URL) -> URL? {
        guard url.scheme == "https",
              let host = url.host?.lowercased(),
              allowedHosts.contains(host),
              url.port == nil,
              url.user == nil, url.password == nil else { return nil }

        var segments = url.pathComponents.filter { $0 != "/" }
        if let first = segments.first, ["en", "tr"].contains(first) { segments.removeFirst() }
        guard segments.count == 2,
              ["t", "p"].contains(segments[0]),
              segments[1].range(of: codePattern, options: .regularExpression) != nil else { return nil }
        return url
    }

    /// Same URL the web "Points de contact" screen prints on QR codes, so a
    /// tag and a sticker for one touchpoint share the same attribution.
    static func touchpointURL(code: String) -> URL? {
        guard code.range(of: codePattern, options: .regularExpression) != nil else { return nil }
        return Config.publicLinkBaseURL.appending(path: "/t/\(code)")
    }
}

enum NFCTagError: Error, Equatable {
    case unavailable
    case notMinervaTag
    case notWritable
    case tooLarge
    case multipleTags
    case failed
}

/// Reads one NDEF tag; the result is already validated (see NFCTagURL).
final class NFCTagReader: NSObject, NFCNDEFReaderSessionDelegate {
    static var isAvailable: Bool { NFCNDEFReaderSession.readingAvailable }

    private var session: NFCNDEFReaderSession?
    private var completion: ((Result<URL, NFCTagError>) -> Void)?

    func begin(prompt: String, completion: @escaping (Result<URL, NFCTagError>) -> Void) {
        guard Self.isAvailable else {
            completion(.failure(.unavailable))
            return
        }
        self.completion = completion
        let session = NFCNDEFReaderSession(delegate: self, queue: .main, invalidateAfterFirstRead: true)
        session.alertMessage = prompt
        self.session = session
        session.begin()
    }

    private func finish(_ result: Result<URL, NFCTagError>) {
        let callback = completion
        completion = nil
        callback?(result)
    }

    func readerSession(_ session: NFCNDEFReaderSession, didDetectNDEFs messages: [NFCNDEFMessage]) {
        let url = messages
            .flatMap(\.records)
            .compactMap { $0.wellKnownTypeURIPayload() }
            .compactMap(NFCTagURL.validated)
            .first
        finish(url.map(Result.success) ?? .failure(.notMinervaTag))
    }

    func readerSession(_ session: NFCNDEFReaderSession, didInvalidateWithError error: Error) {
        self.session = nil
        let code = (error as? NFCReaderError)?.code
        // Expected endings: the successful single read, or the user closing the sheet.
        if code == .readerSessionInvalidationErrorFirstNDEFTagRead || code == .readerSessionInvalidationErrorUserCanceled { return }
        finish(.failure(.failed))
    }
}

/// Writes a Minerva touchpoint URL onto a blank or re-usable NDEF tag.
final class NFCTagWriter: NSObject, NFCNDEFReaderSessionDelegate {
    private var session: NFCNDEFReaderSession?
    private var url: URL?
    private var completion: ((Result<Void, NFCTagError>) -> Void)?

    func begin(url: URL, prompt: String, completion: @escaping (Result<Void, NFCTagError>) -> Void) {
        guard NFCTagReader.isAvailable else {
            completion(.failure(.unavailable))
            return
        }
        self.url = url
        self.completion = completion
        // invalidateAfterFirstRead stays false: the session must stay open to write after detection.
        let session = NFCNDEFReaderSession(delegate: self, queue: .main, invalidateAfterFirstRead: false)
        session.alertMessage = prompt
        self.session = session
        session.begin()
    }

    private func finish(_ result: Result<Void, NFCTagError>, session: NFCNDEFReaderSession, successMessage: String? = nil, failureMessage: String? = nil) {
        guard completion != nil else { return }
        let callback = completion
        completion = nil
        switch result {
        case .success:
            if let successMessage { session.alertMessage = successMessage }
            session.invalidate()
        case .failure:
            session.invalidate(errorMessage: failureMessage ?? "Échec de l'écriture.")
        }
        callback?(result)
    }

    // Required by the protocol; writing is driven by didDetect tags below.
    func readerSession(_ session: NFCNDEFReaderSession, didDetectNDEFs messages: [NFCNDEFMessage]) {}

    func readerSession(_ session: NFCNDEFReaderSession, didDetect tags: [any NFCNDEFTag]) {
        guard tags.count == 1, let tag = tags.first else {
            session.alertMessage = "Plus d'un tag détecté. Retirez-en un."
            DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(500)) { session.restartPolling() }
            return
        }
        guard let url,
              let payload = NFCNDEFPayload.wellKnownTypeURIPayload(url: url) else {
            finish(.failure(.failed), session: session)
            return
        }
        let message = NFCNDEFMessage(records: [payload])

        session.connect(to: tag) { [weak self] error in
            guard let self else { return }
            if error != nil {
                self.finish(.failure(.failed), session: session, failureMessage: "Impossible de lire le tag. Réessayez.")
                return
            }
            tag.queryNDEFStatus { status, capacity, error in
                guard error == nil else {
                    self.finish(.failure(.failed), session: session, failureMessage: "Impossible de lire le tag. Réessayez.")
                    return
                }
                switch status {
                case .notSupported:
                    self.finish(.failure(.notWritable), session: session, failureMessage: "Ce tag n'est pas compatible.")
                case .readOnly:
                    self.finish(.failure(.notWritable), session: session, failureMessage: "Ce tag est verrouillé en lecture seule.")
                case .readWrite:
                    guard message.length <= capacity else {
                        self.finish(.failure(.tooLarge), session: session, failureMessage: "Ce tag est trop petit pour ce lien.")
                        return
                    }
                    tag.writeNDEF(message) { error in
                        if error == nil {
                            self.finish(.success(()), session: session, successMessage: "Tag programmé.")
                        } else {
                            self.finish(.failure(.failed), session: session, failureMessage: "L'écriture a échoué. Réessayez.")
                        }
                    }
                @unknown default:
                    self.finish(.failure(.failed), session: session)
                }
            }
        }
    }

    func readerSession(_ session: NFCNDEFReaderSession, didInvalidateWithError error: Error) {
        self.session = nil
        let code = (error as? NFCReaderError)?.code
        // User dismissed the sheet, or we already finished: not an error to report.
        if code == .readerSessionInvalidationErrorUserCanceled || completion == nil { completion = nil; return }
        let callback = completion
        completion = nil
        callback?(.failure(.failed))
    }
}
