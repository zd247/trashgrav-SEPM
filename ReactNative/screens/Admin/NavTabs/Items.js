import React from 'react'
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	FlatList,
	TextInput,
	Alert,
	Modal,
	Image,
	ImageBackground,
	ActivityIndicator,
	ScrollView,
	Dimensions,
} from 'react-native'

import { normalize } from '../../../helpers/fontHelper'
import Ionicons from 'react-native-vector-icons/Ionicons'
import colors from '../../../assets/colors'
import Feather from 'react-native-vector-icons/Feather'

import { connect } from 'react-redux'
import ListItem from '../../../components/ItemList'

import * as ImageHelpers from '../../../helpers/imageHelpers'
import { snapshotToArray } from '../../../helpers/firebaseHelpers'
import * as firebase from 'firebase/app'
import 'firebase/storage'

//TODO: add toggle loading props from redux

class Items extends React.Component {
	constructor() {
		super()
		this.state = {
			data: [],
			data_temp: [],
			search: '',
			popUpVisible: false,
			newItemImage: '',
			newItemPrice: '',
			newItemName: '',
			newItemDescription: '',
			isLoading: false,
			isFetching: false,
		}
	}

	loadDataFromServer = async () => {
		this.props.toggleIsLoadingItems(true)
		const recycleItems = await firebase.database().ref('Items').once('value') // retrieve data from server
		const recycleItemsArray = snapshotToArray(recycleItems) // arrayed the data
		this.props.loadRecycleItem(recycleItemsArray) // store into redux
		this.setState({ data_temp: recycleItemsArray })
		this.setState({ data: recycleItemsArray })
		this.props.toggleIsLoadingItems(false)
		this.setState({ isLoading: false })
		this.setState({ isFetching: false })
	}

	componentDidMount = () => {
		this.loadDataFromServer()
		this.props.toggleIsLoadingItems(false)
	}

	componentWillUnmount() {
		console.log('[Items] unmount')
		firebase.database().ref('Items').off()
	}

	renderData = (item, index) => (
		<ListItem item={item}>
			<View style={{ flexDirection: 'column' }}>
				<TouchableOpacity
					onPress={() => {
						this.onDeleteItem(item, index)
					}}
					style={{ marginBottom: normalize(50), paddingHorizontal: normalize(10) }}>
					<Ionicons name='ios-trash' color='gray' size={normalize(30)} />
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.button}
					onPress={() => {
						this.onItemDetail(item, index)
					}}>
					<Ionicons name='ios-brush' color='white' size={normalize(15)} />
				</TouchableOpacity>
			</View>
		</ListItem>
	)

	setPopUpVisibility = visible => {
		this.setState({ popUpVisible: visible })
	}

	onItemDetail = (item, index) => {
		this.props.props.navigation.replace('ItemScreen', { item })
	}
	resetNewItemState = () => {
		this.setState({ newItemImage: '' })
		this.setState({ newItemName: '' })
		this.setState({ newItemPrice: '' })
		this.setState({ newItemDescription: '' })
		this.props.toggleIsLoadingItems(false)
		this.setState({ isLoading: false })
		this.setState({ isFetching: false })
	}

	searchData = text => {
		let data = []
		this.state.data_temp.map(function (value) {
			if (value.key.indexOf(text.toLowerCase()) > -1) {
				data.push(value)
			}
		})
		this.setState({
			data: data,
			search: text,
		})
	}

	onRefreshData = () => {
		this.setState({ isFetching: true })
		this.loadDataFromServer()
	}

	uploadImage = async image => {
		this.props.toggleIsLoadingItems(true)
		const ref = firebase.storage().ref('Item Pictures/new_item_picture_temp')

		try {
			//converting to blob
			const blob = await ImageHelpers.prepareBlob(image.uri)
			const snapshot = await ref.put(blob)

			let downloadUrl = await ref.getDownloadURL()

			blob.close()

			this.props.toggleIsLoadingItems(false)

			return downloadUrl
		} catch (error) {
			console.log(error)
		}
	}

	openImageLibrary = async () => {
		this.props.toggleIsLoadingItems(true)
		const result = await ImageHelpers.openImageLibrary()

		if (result) {
			const downloadUrl = await this.uploadImage(result)
			this.setState({ newItemImage: downloadUrl })
			this.props.toggleIsLoadingItems(false)
		}
	}

	openCamera = async () => {
		this.props.toggleIsLoadingItems(true)
		const result = await ImageHelpers.openCamera()

		if (result) {
			const downloadUrl = await this.uploadImage(result)
			this.setState({ newItemImage: downloadUrl })
			this.props.toggleIsLoadingItems(false)
		}
	}

	changePicture() {
		Alert.alert(
			'Loading image',
			'Choose an existing option... ',
			[
				{
					text: 'No',
					style: 'cancel',
				},
				{
					text: 'Photos',
					onPress: () => {
						this.openImageLibrary()
					},
				},
				{
					text: 'Camera',
					onPress: () => {
						this.openCamera()
					},
				},
			],
			{ cancelable: false }
		)
	}

	onAddNewItem = () => {
		this.setState({ isLoading: true })
		const price = this.state.newItemPrice
		const category = this.state.newItemName.toLowerCase()
		const description = this.state.newItemDescription
		const image = this.state.newItemImage

		if (!isNaN(price) && category.length >= 2) {
			firebase.database().ref('Items/').child(category).set({
				description,
				category,
				price,
				image,
			})
			this.loadDataFromServer() // store data in redux from firebase
			this.setPopUpVisibility(false)
		} else {
			alert('Please fill in necessary fields')
		}
	}

	onDeleteItem = (item, index) => {
		this.setState({ isLoading: true })
		Alert.alert(
			'Deleting item...',
			'Are you sure you want to remove this item from the recycle list ?',
			[
				{
					text: 'No',
					style: 'cancel',
					onPress: () => {
						this.setState({ isLoading: false })
					},
				},
				{
					text: 'Yes',
					onPress: () => {
						firebase.database().ref('Items').child(item.key).remove()
						this.loadDataFromServer()
					},
				},
			],
			{ cancelable: false }
		)
	}

	render() {
		return (
			<View style={styles.container}>
				{this.state.isLoading ? (
					<View
						style={[
							StyleSheet.absoluteFill,
							{
								alignItems: 'center',
								justifyContent: 'center',
								zIndex: 1000,
								elevation: 1000,
							},
						]}>
						<ActivityIndicator size='large' color={colors.logoColor} />
					</View>
				) : null}
				<View style={{ flexDirection: 'row' }}>
					<TouchableOpacity
						style={[
							styles.button,
							{ alignSelf: 'center', marginHorizontal: 8 },
						]}
						onPress={() => {
							this.setPopUpVisibility(true)
							this.resetNewItemState()
						}}>
						<Text style={{ color: 'white', fontSize: 17, alignSelf: 'center' }}>
							+
						</Text>
					</TouchableOpacity>
					<View style={styles.section}>
						<TextInput
							placeholder='Search..'
							style={{ flex: 1, marginLeft: 10 }}
							value={this.state.search}
							autoCapitalize='none'
							onChangeText={text => this.searchData(text)}
						/>
						<TouchableOpacity
							onPress={() => this.searchData('')}
							style={{ paddingHorizontal: 10 }}>
							<Ionicons name='ios-close' color='gray' size={20} />
						</TouchableOpacity>
					</View>
				</View>

				<FlatList
					data={this.state.data}
					renderItem={({ item, index }) => this.renderData(item, index)}
					keyExtractor={(item, index) => index.toString()}
					onRefresh={() => this.onRefreshData()}
					refreshing={this.state.isFetching}
					ListEmptyComponent={
						<View style={{ marginTop: normalize(50), alignItems: 'center' }}>
							<Text style={{ fontWeight: 'bold' }}>
								No Recycle Item Currently Exist In this List
							</Text>
						</View>
					}
				/>



				<Modal
					animationType='fade'
					transparent={true}
					visible={this.state.popUpVisible}>
					<View style={{ flex: 1 }}>
						<ScrollView style={{ flex: 1 }}>
							<View style={styles.modalContainer}>
								<ImageBackground
									source={require('../../../assets/admin_header_detail_bg.png')}
									style={{ flex: 1, alignItems: 'center' }}
									resizeMode={'stretch'}>
									<View style={styles.image_container}>
										<TouchableOpacity
											onPress={() => this.setPopUpVisibility(false)}
											style={{
												paddingHorizontal: normalize(10),
												position: 'absolute',
												left: normalize(-50),
												top: normalize(-40),
											}}>
											<Ionicons
												name='ios-close'
												color='white'
												size={normalize(30)}
											/>
										</TouchableOpacity>
										<Text
											style={{
												paddingHorizontal: normalize(10),
												position: 'absolute',
												top: normalize(-40),
												left: normalize(9),
												fontSize: normalize(18),
												fontWeight: 'bold',
												color: 'white',
											}}>
											ADD NEW ITEM
										</Text>
										<TouchableOpacity
											disabled={false}
											style={{ flex: 1 }}
											onPress={() => this.changePicture()}>
											{this.props.recycleItemList.isLoading && (
												<View
													style={{
														...StyleSheet.absoluteFill,
														alignItems: 'center',
														justifyContent: 'center',
														zIndex: 1000,
														elevation: 1000,
													}}>
													<ActivityIndicator
														size='large'
														color={colors.logoColor}
													/>
												</View>
											)}
											{this.state.newItemImage ? (
												<Image
													source={{ uri: this.state.newItemImage }}
													style={styles.image}
												/>
											) : (
												<Image
													source={require('../../../assets/recycle_icon.png')}
													style={styles.image}
												/>
											)}
										</TouchableOpacity>
									</View>
								</ImageBackground>
								<ScrollView style={styles.footer}>
									<Text style={styles.textPrice}>Price</Text>
									<View style={{ flexDirection: 'row' }}>
										<Text style={[styles.textPrice, { marginTop: 3 }]}>$ </Text>
										<TextInput
											style={[
												styles.textPrice,
												{
													color: '#556B2F',
													borderBottomColor: 'grey',
													borderBottomWidth: 0.4,
												},
											]}
											placeholder='Ex: 19.95'
											keyboardType='decimal-pad'
											maxLength={6}
											onChangeText={price => {
												this.setState({ newItemPrice: price })
											}}
										/>
									</View>
									<Text style={styles.textName}>Item name</Text>
									<TextInput
										numberOfLines={1}
										style={[
											styles.textName,
											{
												borderBottomColor: 'grey',
												borderBottomWidth: 0.4,
												color: '#696969',
											},
										]}
										autoCapitalize='characters'
										placeholder='Ex: WASTE'
										autoCorrect={false}
										value={this.state.newItemName}
										onChangeText={name => {
											this.setState({ newItemName: name })
										}}
									/>
									<TextInput
										style={styles.textDetail}
										placeholder='Enter the recycle item details here...'
										autoCapitalize='sentences'
										value={this.state.newItemDescription}
										onChangeText={text => {
											this.setState({ newItemDescription: text })
										}}
									/>
								</ScrollView>
								<Text
									style={{
										color: colors.bgAdminLogin,
										fontSize: normalize(30),
										fontWeight: 'bold',
										alignSelf: 'center',
										marginTop: normalize(10),
									}}>
									- - - - - - - - - -
								</Text>
								<TouchableOpacity
									onPress={this.onAddNewItem}
									style={{ alignItems: 'flex-end' }}>
									<View style={styles.modalButton}>
										<Feather
											name='arrow-right'
											color='white'
											size={normalize(25)}
										/>
									</View>
								</TouchableOpacity>
							</View>
						</ScrollView>
					</View>
				</Modal>
			</View>
		)
	}
}

const mapStateToProps = state => {
	return {
		recycleItemList: state.recycleItemList,
	}
}

const mapDispatchToProps = dispatch => {
	return {
		loadRecycleItem: recycleItemList =>
			dispatch({
				type: 'LOAD_RECYCLE_ITEMS_FROM_SERVER',
				payload: recycleItemList,
			}),
		toggleIsLoadingItems: bool =>
			dispatch({ type: 'TOGGLE_IS_LOADING_ITEMS', payload: bool }),
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Items)

const height = Dimensions.get('screen').height
const height_image = height * 0.5 * 0.5

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'white',
	},
	button: {
		width: normalize(30),
		height: normalize(30),
		backgroundColor: colors.bgAdminLogin,
		borderRadius: 15,
		justifyContent: 'center',
		alignItems: 'center',
	},
	section: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '85%',
		paddingVertical: normalize(5),
		paddingHorizontal: normalize(10),
		borderRadius: 10,
		backgroundColor: '#f2f2f2',
		marginVertical: normalize(10),
	},
	modalContainer: {
		backgroundColor: '#f2f2f2',
		margin: normalize(20),
		marginTop: normalize(40),
		borderWidth: 2.5,
		flex: 1,
	},
	footer: {
		flex: 1,
		paddingHorizontal: normalize(15),
	},
	image_container: {
		width: height_image,
		height: height_image,
		marginTop: height_image / 3,
	},
	image: {
		width: '85%',
		height: '85%',
		alignSelf: 'center',
		borderWidth: 5,
		borderColor: 'grey',
		borderRadius: 30,
	},
	textPrice: {
		color: 'green',
		fontWeight: 'bold',
		fontSize: normalize(15),
	},
	textName: {
		color: '#3e3c3e',
		fontWeight: 'bold',
		fontSize: normalize(20),
		marginTop: normalize(5),
	},
	textDetail: {
		color: 'gray',
		marginTop: normalize(10),
		marginBottom: normalize(20),
	},
	modalButton: {
		width: normalize(80),
		backgroundColor: colors.bgAdminLogin,
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: normalize(8),
		margin: normalize(15),
	},
})
