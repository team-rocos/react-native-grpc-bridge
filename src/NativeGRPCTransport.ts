import { grpc } from '@improbable-eng/grpc-web';
import url from 'url';
import type { GrpcCall } from './GrpcCall';
import type { GrpcConfig, GrpcMetadata, GrpcMethodType } from './types';
import { GrpcClientImpl } from './GrpcClient';

export function NativeGRPCTransport(
  init: grpc.XhrTransportInit
): grpc.TransportFactory {
  return (opts: grpc.TransportOptions) => {
    return new NativeGRPC(opts, init);
  };
}

const frameResponse = (e: Uint8Array) => {
  const t = e,
    n = new ArrayBuffer(t.byteLength + 5);
  return (
    new DataView(n, 1, 4).setUint32(0, t.length, !1),
    new Uint8Array(n, 5).set(t),
    new Uint8Array(n)
  );
};

class NativeGRPC implements grpc.Transport {
  options: grpc.TransportOptions;
  init: grpc.XhrTransportInit;
  methodType!: GrpcMethodType;
  call!: GrpcCall;
  metadata!: grpc.Metadata;
  index!: 0;

  constructor(
    transportOptions: grpc.TransportOptions,
    init: grpc.XhrTransportInit
  ) {
    this.options = transportOptions;
    this.init = init;
  }

  sendMessage(msgBytes: Uint8Array) {
    // strip the first 5 bytes from message as it is added by grpc-web
    this.call
      .sendMessage(msgBytes ? msgBytes.slice(5, msgBytes.length) : msgBytes)
      .then((response) => {
        this.options.debug &&
          console.log('NativeGRPC.sendMessage', response, this.methodType);
        // finish sending messages for server and unary calls
        if (
          response &&
          ['unary', 'serverStreaming'].indexOf(this.methodType) !== -1
        ) {
          this.call.finishSendMessage();
        }
      })
      .catch((error) => {
        this.options.debug &&
          console.log('NativeGRPC.sendMessage error', error);
        throw error;
      });
  }

  finishSend() {
    this.call.finishSendMessage();
  }

  start(metadata: grpc.Metadata) {
    this.metadata = metadata || {};
    const headers: GrpcMetadata = {};
    this.metadata.forEach((key: string | number, values: any[]) => {
      headers[key] = values.join(', ');
    });

    const grpcMethod = `/${this.options.methodDefinition.service.serviceName}/${this.options.methodDefinition.methodName}`;
    this.methodType = 'bidiStreaming';
    if (
      this.options.methodDefinition.requestStream &&
      this.options.methodDefinition.responseStream
    ) {
      this.methodType = 'bidiStreaming';
    } else if (
      this.options.methodDefinition.requestStream &&
      !this.options.methodDefinition.responseStream
    ) {
      this.methodType = 'clientStreaming';
    } else if (
      !this.options.methodDefinition.requestStream &&
      this.options.methodDefinition.responseStream
    ) {
      this.methodType = 'serverStreaming';
    } else if (
      !this.options.methodDefinition.requestStream &&
      !this.options.methodDefinition.responseStream
    ) {
      this.methodType = 'unary';
    }
    const urlObject = url.parse(this.options.url);
    const grpcConfig: GrpcConfig = {
      host: urlObject.host as string,
      isInsecure: urlObject.protocol !== 'https:',
    };

    this.call = GrpcClientImpl.startCall(
      grpcConfig,
      grpcMethod,
      headers,
      this.methodType
    );
    // const statusOfCall = this.call.trailers.then<any, any>(
    //   () =>
    //     ({
    //       code: 0,
    //       detail: '',
    //     } as any),
    //   ({ error, code }) => ({
    //     code: code,
    //     detail: error,
    //   })
    // );
    // console.log('statusOfCall', statusOfCall);

    this.call.headers
      .then((cHeaders) => {
        console.log('NativeGRPC.headers', cHeaders);
        this.options.onHeaders(
          new grpc.Metadata({ 'grpc-status': '0', ...cHeaders }),
          200
        );
      })
      .catch((error) => {
        console.log('NativeGRPC.error', error);
        this.options.onEnd(error);
      });

    this.call.responses.on('data', (data) => {
      console.log('NativeGRPC.data', data);
      this.options.onChunk(frameResponse(data));
    });

    this.call.responses.on('complete', () => {
      console.log('NativeGRPC.complete');
      this.options.onEnd();
    });

    this.call.responses.on('error', (reason) => {
      console.log('NativeGRPC.error', reason);
      this.options.onEnd(reason);
    });
  }

  cancel() {
    console.log('NativeGRPC.cancel');
    this.call.cancel();
  }
}
