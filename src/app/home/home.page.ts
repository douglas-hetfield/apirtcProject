import { Component } from "@angular/core";
import { Renderer2, ElementRef } from "@angular/core";
import { Platform } from "@ionic/angular";

declare let cordova: any;

@Component({
    selector: "app-home",
    templateUrl: "home.page.html",
    styleUrls: ["home.page.scss"],
})
export class HomePage {
    ua: apiRTC.UserAgent = null;
    connectedSession: apiRTC.Session = null;
    currentCall: apiRTC.Call = null;
    localStream: apiRTC.Stream = null;
    remoteStream: apiRTC.Stream = null;

    onCall: boolean;

    opponentId: any;

    infoLabel: string;

    constructor(
        private renderer: Renderer2,
        private elementRef: ElementRef,
        public platform: Platform
    ) {
        this.onCall = false;
        this.infoLabel = "Initializing...";

        this.platform.ready().then(() => {
            if (this.platform.is('ios')) {
                cordova.plugins.iosrtc.registerGlobals();
            }
            const script = this.renderer.createElement("script");
            script.src = "https://cloud.apizee.com/apiRTC/apiRTC-latest.min.js";
            script.onload = () => {
                console.warn("apiRTC loaded");
                this.startApp();
            };
            this.renderer.appendChild(this.elementRef.nativeElement, script);
        });
    }

    startApp() {
        console.warn("startApp");

        apiRTC.setLogLevel(10);

        this.ua = new apiRTC.UserAgent({
            uri: "apzkey:bff17007a02b12c025350eace38cf7fc",
        });

        let registerInformation = {
            cloudUrl: "https://cloud.apizee.com",
        };

        this.ua
            .register(registerInformation)
            .then((session) => {
                console.warn("User registered with session: ", session);

                session
                    .on("contactListUpdate", (updatedContacts) => {
                        console.warn("contactListUpdate", updatedContacts);
                    })
                    .on("incomingCall", (invitation) => {
                        invitation.accept().then((call) => {
                            this.currentCall = call;
                            this.setCallListeners();
                            this.onCall = true;
                        });
                    });
                this.connectedSession = session;
                this.infoLabel = "Your id: " + session.getId();
            })
            .catch(function (error) {
                console.error("User agent registration failed", error);
            });

        this.checkPermissions();
    }

    setCallListeners = () => {
        this.currentCall
            .on("localStreamAvailable", (stream) => {
                console.warn("localStreamAvailable", stream);
                this.localStream = stream;
                stream.addInDiv(
                    "local-stream",
                    "local-media",
                    { height: "150px" },
                    false
                );
            })
            .on("streamAdded", (stream) => {
                console.warn("streamAdded :", stream);
                this.remoteStream = stream;
                stream.addInDiv(
                    "remote-stream",
                    "remote-media",
                    { height: "150px" },
                    false
                );
            })
            .on("streamRemoved", (stream) => {
                stream.removeFromDiv("remote-stream", "remote-media");
                this.remoteStream = null;
            })
            .on("userMediaError", (e) => {
                console.error("userMediaError detected : ", e);
                console.error("userMediaError detected with error : ", e.error);
            })
            .on("hangup", () => {
                this.clearStreams();
                this.currentCall = null;
                this.onCall = false;
            });
    };

    onClickCall = () => {
        if (!this.opponentId) {
            console.warn("Opponent number is null");
            return;
        }
        if (this.onCall) {
            console.warn("Call is already started");
            return;
        }
        let contact = this.connectedSession.getOrCreateContact(this.opponentId);
        let call = contact.call();
        if (!call) {
            console.warn("Cannot establish the call");
            return;
        }
        this.currentCall = call;
        this.setCallListeners();
        this.onCall = true;
    };

    onClickHangUp = () => {
        this.clearStreams();
        this.currentCall.hangUp();
        this.currentCall = null;
        this.onCall = false;
    };

    checkPermissions = () => {
        cordova.plugins.diagnostic.requestRuntimePermissions(
            (statuses) => {
                console.warn("Permissions statuses: ", statuses);
            },
            (error) => {
                console.error("The following error occurred: ", error);
            },
            [
                cordova.plugins.diagnostic.permission.CAMERA,
                cordova.plugins.diagnostic.permission.RECORD_AUDIO,
            ]
        );
    };

    clearStreams = () => {
        if (this.localStream) {
            this.localStream.removeFromDiv("local-stream", "local-media");
        }
        if (this.remoteStream) {
            this.remoteStream.removeFromDiv("remote-stream", "remote-media");
        }
        this.localStream = null;
        this.remoteStream = null;
    };
}
