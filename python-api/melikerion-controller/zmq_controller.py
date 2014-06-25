# ZeroMQ
import zmq
import threading

# ZeroMQ socket handling
# based on http://zguide.zeromq.org/py:mtserver
class ZMQController( object ):
	def __init__(self, ctrlType, config, workerClass):
		self.cfg = config
		self.type = ctrlType
		self.workerClass = workerClass

		self._createSockets()

	def _createSockets(self):
		self.context = zmq.Context.instance()

		if self.type is 'som':
			self.bindAddress = self.cfg.getZMQVar('bind_som')
			self.workerAddress = self.cfg.getZMQVar('bind_som_workers')
		elif self.type is 'plane':
			self.bindAddress = self.cfg.getZMQVar('bind_plane')
			self.workerAddress = self.cfg.getZMQVar('bind_plane_workers')
		else:
			raise Exception('Unknown ZMQController type')

		# Socket to talk to clients
		self.clients = self.context.socket(zmq.ROUTER)
		self.clients.bind( self.bindAddress )

		# Socket to talk to workers
		self.workers = self.context.socket(zmq.DEALER)
		self.workers.bind( self.workerAddress )

	def start(self):
		noWorkers = int( self.cfg.getZMQVar('workers') )

		# start the threads
		for workerNumber in range(0,noWorkers):
			thread = threading.Thread(target=self.workerClass,
				args=(self.cfg, workerNumber, self.workerAddress, zmq, self.context))
			thread.start()

		# prepare the routing
		zmq.device(zmq.QUEUE, self.clients, self.workers)

		# We never get here but clean up anyhow
		clients.close()
		workers.close()
		context.term()