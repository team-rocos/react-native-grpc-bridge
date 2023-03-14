import { grpc } from '@improbable-eng/grpc-web';
import { NativeGRPCTransport } from '@team-rocos/react-native-grpc-bridge';
grpc.setDefaultTransport(NativeGRPCTransport({ withCredentials: true }));
